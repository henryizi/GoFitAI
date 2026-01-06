import Foundation
import StoreKit
import React

@objc(StoreKitDirectFetcher)
class StoreKitDirectFetcher: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func fetchProducts(
    _ productIds: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("[StoreKitDirect] 🍎 Fetching products directly from App Store Connect...")
    print("[StoreKitDirect] Product IDs: \(productIds)")
    
    // Use StoreKit 2 API to fetch products directly
    Task {
      do {
        // Fetch products directly from App Store Connect using StoreKit 2
        let storeProducts = try await Product.products(for: Set(productIds))
        
        print("[StoreKitDirect] ✅ Successfully fetched \(storeProducts.count) products from App Store Connect")
        
        // Convert StoreKit 2 products to dictionary format
        var productsArray: [[String: Any]] = []
        
        for product in storeProducts {
          // StoreKit 2 doesn't expose priceLocale directly, but displayPrice is localized
          // We'll extract currency from the locale or default to USD
          // The price is a Decimal, displayPrice is a localized String
          let locale = Locale.current
          let currencyCode = locale.currencyCode ?? "USD"
          
          var productDict: [String: Any] = [
            "identifier": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "price": Double(truncating: product.price as NSDecimalNumber),
            "displayPrice": product.displayPrice,
            "currencyCode": currencyCode,
            "type": product.type.rawValue,
            "isAvailable": true
          ]
          
          // Add subscription info if available
          if let subscription = product.subscription {
            // Convert subscription period unit to string
            let periodUnit: String
            switch subscription.subscriptionPeriod.unit {
            case .day:
              periodUnit = "day"
            case .week:
              periodUnit = "week"
            case .month:
              periodUnit = "month"
            case .year:
              periodUnit = "year"
            @unknown default:
              periodUnit = "unknown"
            }
            
            var subscriptionDict: [String: Any] = [
              "subscriptionPeriod": subscription.subscriptionPeriod.value,
              "subscriptionPeriodUnit": periodUnit
            ]
            
            if let introOffer = subscription.introductoryOffer {
              // Convert intro offer period unit to string
              let introPeriodUnit: String
              switch introOffer.period.unit {
              case .day:
                introPeriodUnit = "day"
              case .week:
                introPeriodUnit = "week"
              case .month:
                introPeriodUnit = "month"
              case .year:
                introPeriodUnit = "year"
              @unknown default:
                introPeriodUnit = "unknown"
              }
              
              subscriptionDict["introductoryOffer"] = [
                "price": Double(truncating: introOffer.price as NSDecimalNumber),
                "displayPrice": introOffer.displayPrice,
                "period": introOffer.period.value,
                "periodUnit": introPeriodUnit
              ]
            }
            
            productDict["subscription"] = subscriptionDict
          }
          
          productsArray.append(productDict)
          
          print("[StoreKitDirect]   \(product.id): \(product.displayPrice) (\(currencyCode))")
          print("[StoreKitDirect]     Raw price: \(Double(truncating: product.price as NSDecimalNumber))")
          print("[StoreKitDirect]     Display name: \(product.displayName)")
        }
        
        // Check for missing products
        let foundIds = Set(storeProducts.map { $0.id })
        let missingIds = productIds.filter { !foundIds.contains($0) }
        
        if !missingIds.isEmpty {
          print("[StoreKitDirect] ⚠️ Missing products: \(missingIds)")
          for missingId in missingIds {
            print("[StoreKitDirect]   ❌ \(missingId) - Not found in App Store Connect")
            print("[StoreKitDirect]   Check: 1. Product exists in App Store Connect")
            print("[StoreKitDirect]         2. Product is approved/ready")
            print("[StoreKitDirect]         3. Product ID matches exactly")
          }
        }
        
        let result: [String: Any] = [
          "products": productsArray,
          "missingProducts": missingIds,
          "fetchedAt": ISO8601DateFormatter().string(from: Date())
        ]
        
        resolve(result)
        
      } catch {
        print("[StoreKitDirect] ❌ Error fetching products: \(error.localizedDescription)")
        reject("STOREKIT_ERROR", "Failed to fetch products from App Store Connect: \(error.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func checkProductAvailability(
    _ productId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("[StoreKitDirect] 🔍 Checking availability for: \(productId)")
    
    Task {
      do {
        let products = try await Product.products(for: [productId])
        let isAvailable = !products.isEmpty
        
        if isAvailable {
          let product = products.first!
          let locale = Locale.current
          let currencyCode = locale.currencyCode ?? "USD"
          print("[StoreKitDirect] ✅ Product available: \(product.displayPrice)")
          resolve([
            "available": true,
            "price": Double(truncating: product.price as NSDecimalNumber),
            "displayPrice": product.displayPrice,
            "currencyCode": currencyCode
          ])
        } else {
          print("[StoreKitDirect] ❌ Product not available")
          resolve([
            "available": false
          ])
        }
      } catch {
        print("[StoreKitDirect] ❌ Error checking availability: \(error.localizedDescription)")
        reject("STOREKIT_ERROR", "Failed to check product availability: \(error.localizedDescription)", error)
      }
    }
  }
}
