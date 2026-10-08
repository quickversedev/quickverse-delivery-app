package com.qvtransportersappui

import android.media.AudioAttributes
import android.media.MediaPlayer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OrderAlertSoundModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var mediaPlayer: MediaPlayer? = null

  override fun getName(): String = "OrderAlertSound"

  @ReactMethod
  fun start(promise: Promise) {
    try {
      if (mediaPlayer?.isPlaying == true) {
        promise.resolve(null)
        return
      }

      mediaPlayer?.release()
      val player = MediaPlayer()
      mediaPlayer = player
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      val descriptor = reactContext.resources.openRawResourceFd(R.raw.noti1)
        ?: throw IllegalStateException("Unable to load res/raw/noti1.mp3")
      player.setDataSource(
        descriptor.fileDescriptor,
        descriptor.startOffset,
        descriptor.length,
      )
      descriptor.close()
      player.prepare()
      player.isLooping = true
      player.start()
      promise.resolve(null)
    } catch (error: Exception) {
      mediaPlayer?.release()
      mediaPlayer = null
      promise.reject("ORDER_ALERT_SOUND_START_FAILED", error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    mediaPlayer?.stop()
    mediaPlayer?.release()
    mediaPlayer = null
    promise.resolve(null)
  }

  override fun invalidate() {
    mediaPlayer?.stop()
    mediaPlayer?.release()
    mediaPlayer = null
    super.invalidate()
  }
}
