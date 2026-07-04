import { sdkLoader, type SdkManifest } from "@/lib/sdkLoader";

export function usePaymentSdk() {
  const executeSdk = (manifest: SdkManifest, dynamicParams: any = {}): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        const SdkClass = await sdkLoader.load(manifest);

        const options = {
          ...manifest.initParams,
          ...dynamicParams,
          handler(response: any) {
            // Map the raw response to generic keys expected by the backend
            const mappedData: any = {};
            if (manifest.verificationDataMapping) {
              for (const [ourKey, theirKey] of Object.entries(manifest.verificationDataMapping)) {
                mappedData[ourKey] = response[theirKey];
              }
            } else {
               Object.assign(mappedData, response);
            }
            resolve(mappedData);
          },
          modal: {
            ondismiss() {
              reject(new Error("Payment cancelled by user"));
            },
          },
        };

        const instance = new SdkClass(options);
        
        // Execute the lifecycle hook defined in the manifest
        const openMethod = manifest.lifecycleHooks?.openMethod || 'open';
        if (typeof instance[openMethod] === 'function') {
           instance[openMethod]();
        } else {
           throw new Error(`SDK does not support open method: ${openMethod}`);
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  return { executeSdk };
}
