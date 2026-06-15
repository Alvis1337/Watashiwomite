# Add project specific ProGuard rules here.
-keep class com.chrisalvis.watashiwomite.** { *; }
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepclassmembernames,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-keep,includedescriptorclasses class com.chrisalvis.watashiwomite.data.api.**$$serializer { *; }
-keepclassmembers class com.chrisalvis.watashiwomite.data.api.** {
    *** Companion;
}
-keepclasseswithmembers class com.chrisalvis.watashiwomite.data.api.** {
    kotlinx.serialization.KSerializer serializer(...);
}
