package com.signatureink

import androidx.core.content.FileProvider

/**
 * Library-owned [FileProvider] backing `copyToClipboard()`.
 *
 * The manifest merger keys `<provider>` nodes by `android:name`, so declaring
 * `androidx.core.content.FileProvider` directly collides with any other library
 * — or the host app — doing the same, and the build fails on the conflicting
 * `android:authorities`. A subclass gives our entry its own merge key.
 * Behaviour is unchanged: `FileProvider.getUriForFile` resolves by authority
 * alone, never by class.
 */
class SignatureInkFileProvider : FileProvider()
