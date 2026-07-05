export interface SdkManifest {
  scriptUrl: string;
  loadingStrategy: string;
  globalKey: string;
  initParams: Record<string, any>;
  verificationDataMapping: Record<string, string>;
  lifecycleHooks: {
    openMethod: string;
  };
}

class SdkLoader {
  private cache: Record<string, boolean> = {};

  async load(manifest: SdkManifest): Promise<any> {
    if (manifest.loadingStrategy !== "external_script") {
      throw new Error(`Unsupported loading strategy: ${manifest.loadingStrategy}`);
    }

    const isLoaded = await this.injectScript(manifest.scriptUrl);
    if (!isLoaded) {
      throw new Error(`Failed to load SDK from ${manifest.scriptUrl}`);
    }

    // Safely extract the SDK constructor from the global scope based on the manifest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SdkClass = (window as any)[manifest.globalKey];
    if (!SdkClass) {
      throw new Error(`SDK global key '${manifest.globalKey}' not found on window object after loading.`);
    }

    return SdkClass;
  }

  private injectScript(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if (this.cache[src]) {
        resolve(true);
        return;
      }

      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        const handleLoad = () => {
          this.cache[src] = true;
          resolve(true);
        };
        const handleError = () => resolve(false);
        existing.addEventListener("load", handleLoad, { once: true });
        existing.addEventListener("error", handleError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        this.cache[src] = true;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
}

export const sdkLoader = new SdkLoader();
