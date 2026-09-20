import UIKit
import React

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "fribee",
      in: window,
      launchOptions: nil
    )

    // Cold-start deep link (custom scheme)
    if let url = connectionOptions.urlContexts.first?.url {
      print("🔗 SceneDelegate cold-start URL: \(url)")
      RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }

    // Cold-start Universal Link
    if let userActivity = connectionOptions.userActivities.first,
       userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
      print("🔗 SceneDelegate cold-start Universal Link: \(url)")
      RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
  }

  // Handle deep links when app is already running (custom URL scheme)
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    print("🔗 SceneDelegate received URL: \(url)")
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  // Handle Universal Links (https:// URLs) when app is already running
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
      print("🔗 SceneDelegate received Universal Link: \(url)")
      RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
  }
}
