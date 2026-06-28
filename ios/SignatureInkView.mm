// Fabric host for the SignatureInk component. Three responsibilities:
//   1. Forward Fabric prop diffs to the Swift `SignatureInkSurface`.
//   2. Dispatch codegen commands (`undo`, `toBase64`, …) to the surface.
//   3. Bridge Swift callbacks back into Fabric event emitters.
// All actual drawing/state lives in SignatureInkSurface.swift.
#import "SignatureInkView.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/SignatureInkViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/SignatureInkViewSpec/EventEmitters.h>
#import <react/renderer/components/SignatureInkViewSpec/Props.h>
#import <react/renderer/components/SignatureInkViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#if __has_include("SignatureInk-Swift.h")
#import "SignatureInk-Swift.h"
#elif __has_include(<SignatureInk/SignatureInk-Swift.h>)
#import <SignatureInk/SignatureInk-Swift.h>
#elif __has_include("react_native_signature_ink-Swift.h")
#import "react_native_signature_ink-Swift.h"
#endif

using namespace facebook::react;

@interface SignatureInkView () <RCTSignatureInkViewViewProtocol>
@end

@implementation SignatureInkView {
    SignatureInkSurface * _surface;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<SignatureInkViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const SignatureInkViewProps>();
        _props = defaultProps;

        _surface = [[SignatureInkSurface alloc] initWithFrame:frame];
        self.contentView = _surface;

        __weak SignatureInkView *weakSelf = self;

        _surface.onBegin = ^{
            [weakSelf emitOnBegin];
        };
        _surface.onEnd = ^{
            [weakSelf emitOnEnd];
        };
        _surface.onChange = ^(BOOL isEmpty, NSInteger strokeCount) {
            [weakSelf emitOnChangeWithEmpty:isEmpty count:strokeCount];
        };
        _surface.onResult = ^(NSString * _Nonnull requestId,
                              NSString * _Nonnull type,
                              NSString * _Nullable value,
                              NSString * _Nullable error) {
            [weakSelf emitOnResultWithRequestId:requestId type:type value:value error:error];
        };
        _surface.onReplayProgress = ^(CGFloat progress) {
            [weakSelf emitOnReplayProgress:progress];
        };
        _surface.onToolbarAction = ^(NSString * _Nonnull action) {
            [weakSelf emitOnToolbarAction:action];
        };
    }
    return self;
}

#pragma mark - Event emitters

- (void)emitOnBegin
{
    if (auto emitter = std::dynamic_pointer_cast<const SignatureInkViewEventEmitter>(_eventEmitter)) {
        emitter->onBegin({});
    }
}

- (void)emitOnEnd
{
    if (auto emitter = std::dynamic_pointer_cast<const SignatureInkViewEventEmitter>(_eventEmitter)) {
        emitter->onEnd({});
    }
}

- (void)emitOnChangeWithEmpty:(BOOL)isEmpty count:(NSInteger)count
{
    if (auto emitter = std::dynamic_pointer_cast<const SignatureInkViewEventEmitter>(_eventEmitter)) {
        SignatureInkViewEventEmitter::OnStrokesChange payload;
        payload.isEmpty = isEmpty ? true : false;
        payload.strokeCount = (int)count;
        emitter->onStrokesChange(payload);
    }
}

- (void)emitOnResultWithRequestId:(NSString *)requestId
                             type:(NSString *)type
                            value:(NSString * _Nullable)value
                            error:(NSString * _Nullable)error
{
    if (auto emitter = std::dynamic_pointer_cast<const SignatureInkViewEventEmitter>(_eventEmitter)) {
        SignatureInkViewEventEmitter::OnResult payload;
        payload.requestId = std::string([requestId UTF8String]);
        payload.type = std::string([type UTF8String]);
        payload.value = value != nil ? std::string([value UTF8String]) : std::string();
        payload.error = error != nil ? std::string([error UTF8String]) : std::string();
        emitter->onResult(payload);
    }
}

- (void)emitOnReplayProgress:(CGFloat)progress
{
    if (auto emitter = std::dynamic_pointer_cast<const SignatureInkViewEventEmitter>(_eventEmitter)) {
        SignatureInkViewEventEmitter::OnReplayProgress payload;
        payload.progress = (Float)progress;
        emitter->onReplayProgress(payload);
    }
}

- (void)emitOnToolbarAction:(NSString *)action
{
    if (auto emitter = std::dynamic_pointer_cast<const SignatureInkViewEventEmitter>(_eventEmitter)) {
        SignatureInkViewEventEmitter::OnToolbarAction payload;
        std::string idStr = std::string([action UTF8String]);
        payload.itemId = idStr;
        payload.action = idStr;
        emitter->onToolbarAction(payload);
    }
}

#pragma mark - Recycle

/// Fabric pools view instances across React mounts. Reset `_props` to
/// defaults and have the Swift surface scrub every cached prop value
/// so the next mount's `updateProps:` diff lands against a clean
/// slate (see `prepareForReuse` in SignatureInkSurface.swift).
- (void)prepareForRecycle
{
    [_surface prepareForReuse];
    static const auto defaultProps = std::make_shared<const SignatureInkViewProps>();
    _props = defaultProps;
    [super prepareForRecycle];
}

#pragma mark - Props

// One diff-and-forward per prop. Fabric only fires this when at least
// one prop changed; per-prop equality keeps us from re-applying unchanged
// values (which would burn cycles on color conversion / string copies).
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<SignatureInkViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<SignatureInkViewProps const>(props);

    if (oldViewProps.penColor != newViewProps.penColor) {
        _surface.penColor = RCTUIColorFromSharedColor(newViewProps.penColor) ?: [UIColor blackColor];
    }
    if (oldViewProps.penMinWidth != newViewProps.penMinWidth) {
        _surface.penMinWidth = (CGFloat)newViewProps.penMinWidth;
    }
    if (oldViewProps.penMaxWidth != newViewProps.penMaxWidth) {
        _surface.penMaxWidth = (CGFloat)newViewProps.penMaxWidth;
    }
    if (oldViewProps.velocityFilterWeight != newViewProps.velocityFilterWeight) {
        _surface.velocityFilterWeight = (CGFloat)newViewProps.velocityFilterWeight;
    }

    if (oldViewProps.inkBackgroundColor != newViewProps.inkBackgroundColor) {
        _surface.inkBackgroundColor = RCTUIColorFromSharedColor(newViewProps.inkBackgroundColor) ?: [UIColor clearColor];
    }

    if (oldViewProps.showBaseline != newViewProps.showBaseline) {
        _surface.showBaseline = newViewProps.showBaseline;
    }
    if (oldViewProps.baselineColor != newViewProps.baselineColor) {
        _surface.baselineColor = RCTUIColorFromSharedColor(newViewProps.baselineColor) ?: [[UIColor systemGrayColor] colorWithAlphaComponent:0.5];
    }
    if (oldViewProps.baselineOffsetFromBottom != newViewProps.baselineOffsetFromBottom) {
        _surface.baselineOffsetFromBottom = (CGFloat)newViewProps.baselineOffsetFromBottom;
    }
    if (oldViewProps.baselineStyle != newViewProps.baselineStyle) {
        NSString *style = [NSString stringWithUTF8String:newViewProps.baselineStyle.c_str()];
        _surface.baselineStyle = (style.length > 0) ? style : @"dashed";
    }
    if (oldViewProps.baselineWidth != newViewProps.baselineWidth) {
        // Negative values are normalised to 0 (the "auto / per-style
        // default" sentinel); positive values pass through verbatim.
        _surface.baselineWidth = newViewProps.baselineWidth > 0
            ? (CGFloat)newViewProps.baselineWidth
            : 0;
    }

    if (oldViewProps.pencilOnly != newViewProps.pencilOnly) {
        _surface.pencilOnly = newViewProps.pencilOnly;
    }

    if (oldViewProps.showToolbar != newViewProps.showToolbar) {
        _surface.showToolbar = newViewProps.showToolbar;
    }
    if (oldViewProps.toolbarPosition != newViewProps.toolbarPosition) {
        NSString *pos = [NSString stringWithUTF8String:newViewProps.toolbarPosition.c_str()];
        _surface.toolbarPosition = (pos.length > 0) ? pos : @"bottom";
    }
    if (oldViewProps.toolbarItemsJson != newViewProps.toolbarItemsJson) {
        _surface.toolbarItemsJson = [NSString stringWithUTF8String:newViewProps.toolbarItemsJson.c_str()];
    }
    if (oldViewProps.toolbarMaxVisibleButtons != newViewProps.toolbarMaxVisibleButtons) {
        _surface.toolbarMaxVisibleButtons = newViewProps.toolbarMaxVisibleButtons;
    }
    if (oldViewProps.toolbarBackgroundColor != newViewProps.toolbarBackgroundColor) {
        _surface.toolbarBackgroundColor = RCTUIColorFromSharedColor(newViewProps.toolbarBackgroundColor);
    }
    if (oldViewProps.toolbarTintColor != newViewProps.toolbarTintColor) {
        _surface.toolbarTintColor = RCTUIColorFromSharedColor(newViewProps.toolbarTintColor);
    }
    if (oldViewProps.toolbarHeight != newViewProps.toolbarHeight) {
        _surface.toolbarHeight = newViewProps.toolbarHeight > 0
            ? (CGFloat)newViewProps.toolbarHeight
            : 44.0;
    }
    if (oldViewProps.toolbarIconSpacing != newViewProps.toolbarIconSpacing) {
        _surface.toolbarIconSpacing = newViewProps.toolbarIconSpacing >= 0
            ? (CGFloat)newViewProps.toolbarIconSpacing
            : 8.0;
    }

    if (oldViewProps.showToolPicker != newViewProps.showToolPicker) {
        _surface.showToolPicker = newViewProps.showToolPicker;
    }

    if (oldViewProps.defaultInkType != newViewProps.defaultInkType) {
        NSString *inkType = [NSString stringWithUTF8String:newViewProps.defaultInkType.c_str()];
        _surface.defaultInkType = (inkType.length > 0) ? inkType : @"pen";
    }

    [super updateProps:props oldProps:oldProps];
}

#pragma mark - RCTSignatureInkViewViewProtocol (Fabric commands)

- (void)clear
{
    [_surface clear];
}

- (void)undo
{
    [_surface undo];
}

- (void)redo
{
    [_surface redo];
}

- (void)copyToClipboard
{
    [_surface copyToClipboard];
}

- (void)isEmpty:(NSString *)requestId
{
    [_surface isEmptyAndReply:requestId];
}

- (void)toBase64:(NSString *)requestId
          format:(NSString *)format
         quality:(float)quality
            trim:(BOOL)trim
{
    [_surface toBase64:requestId format:format quality:(CGFloat)quality trim:trim];
}

- (void)toFile:(NSString *)requestId
        format:(NSString *)format
       quality:(float)quality
          trim:(BOOL)trim
{
    [_surface toFile:requestId format:format quality:(CGFloat)quality trim:trim];
}

- (void)toSvg:(NSString *)requestId
{
    [_surface toSvg:requestId];
}

- (void)getStrokeData:(NSString *)requestId
{
    [_surface getStrokeData:requestId];
}

- (void)setStrokeData:(NSString *)json
{
    [_surface setStrokeData:json];
}

- (void)replay:(float)speed
{
    [_surface replayWithSpeed:(CGFloat)speed];
}

- (void)saveToPhotoLibrary:(NSString *)requestId
                    format:(NSString *)format
                   quality:(float)quality
                      trim:(BOOL)trim
{
    [_surface saveToPhotoLibrary:requestId
                          format:format
                         quality:(CGFloat)quality
                            trim:trim];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
    RCTSignatureInkViewHandleCommand(self, commandName, args);
}

#pragma mark - Class registration

Class<RCTComponentViewProtocol> SignatureInkViewCls(void)
{
    return SignatureInkView.class;
}

@end
