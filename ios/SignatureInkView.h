// Fabric host wrapper. Implementation lives in SignatureInkView.mm;
// the actual drawing surface (PencilKit + props) lives in
// SignatureInkSurface.swift.
#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

#ifndef SignatureInkViewNativeComponent_h
#define SignatureInkViewNativeComponent_h

NS_ASSUME_NONNULL_BEGIN

@interface SignatureInkView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END

#endif /* SignatureInkViewNativeComponent_h */
