#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StoreKitDirectFetcher, NSObject)

RCT_EXTERN_METHOD(fetchProducts:(NSArray *)productIds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(checkProductAvailability:(NSString *)productId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
