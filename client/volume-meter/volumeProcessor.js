const SMOOTHING_FACTOR = 0.8
const MINIMUM_VALUE = 0.00001
registerProcessor(
  'vumeter',
  class extends AudioWorkletProcessor {
    constructor() {
      super()
      this._leftVolume = 0
      this._rightVolume = 0
      this._updateIntervalInMS = 25
      this._nextUpdateFrame = this._updateIntervalInMS
      this.port.onmessage = (event) => {
        if (event.data.updateIntervalInMS) this._updateIntervalInMS = event.data.updateIntervalInMS
      }
    }

    get intervalInFrames() {
      return (this._updateIntervalInMS / 1000) * sampleRate
    }

    process(inputs, outputs, parameters) {
      const input = inputs[0]

      // Note that the input will be down-mixed to mono; however, if no inputs are
      // connected then zero channels will be passed in.
      if (input.length > 0) {
        const samplesLeft = input[0]
        const samplesRight = input[1]

        let sum = 0
        let rms = 0
        // Calculated the squared-sum.
        if (samplesLeft && samplesLeft.length) {
          for (let i = 0; i < samplesLeft.length; ++i) {
            sum += samplesLeft[i] * samplesLeft[i]
          }
          // Calculate the RMS level and update the volume.
          rms = Math.sqrt(sum / samplesLeft.length)
          this._leftVolume = Math.max(rms, this._leftVolume * SMOOTHING_FACTOR)
          if (this._leftVolume < 1e-10) {
            this._leftVolume = 0
          }
        }
        if (samplesRight) {
          sum = 0
          rms = 0
          // Calculated the squared-sum.
          for (let j = 0; j < samplesRight.length; ++j) sum += samplesRight[j] * samplesRight[j]

          // Calculate the RMS level and update the volume.
          rms = Math.sqrt(sum / samplesRight.length)
          this._rightVolume = Math.max(rms, this._rightVolume * SMOOTHING_FACTOR)
          if (this._rightVolume < 1e-10) {
            this._rightVolume = 0
          }
        }

        // Update and sync the volume property with the main thread.
        this._nextUpdateFrame -= samplesLeft.length
        if (this._nextUpdateFrame < 0) {
          this._nextUpdateFrame += this.intervalInFrames
          let volume = Math.max(this._leftVolume, this._rightVolume)
          if (!(volume > -1)) {
            if (this._leftVolume > -1) {
              volume = this._leftVolume
            } else if (this._rightVolume > -1) {
              volume = this._rightVolume
            }
          }
          if (samplesRight) {
            this.port.postMessage({
              left: this._leftVolume,
              right: this._rightVolume,
              volume: volume
            })
          } else {
            this.port.postMessage({
              volume: volume
            })
          }
        }
      }
      // Note that the input will be down-mixed to mono; however, if no inputs are
      // connected then zero channels will be passed in.
      if (input.length > 0) {
        const samplesLeft = input[0]
        const samplesRight = input[1]

        let sum = 0
        let rms = 0
        // Calculated the squared-sum.
        if (samplesLeft && samplesLeft.length) {
          for (let i = 0; i < samplesLeft.length; ++i) {
            sum += samplesLeft[i] * samplesLeft[i]
          }
          // Calculate the RMS level and update the volume.
          rms = Math.sqrt(sum / samplesLeft.length)
          this._leftVolume = Math.max(rms, this._leftVolume * SMOOTHING_FACTOR)
          if (this._leftVolume < 1e-10) {
            this._leftVolume = 0
          }
        }
        if (samplesRight) {
          sum = 0
          rms = 0
          // Calculated the squared-sum.
          for (let j = 0; j < samplesRight.length; ++j) sum += samplesRight[j] * samplesRight[j]

          // Calculate the RMS level and update the volume.
          rms = Math.sqrt(sum / samplesRight.length)
          this._rightVolume = Math.max(rms, this._rightVolume * SMOOTHING_FACTOR)
          if (this._rightVolume < 1e-10) {
            this._rightVolume = 0
          }
        }

        // Update and sync the volume property with the main thread.
        this._nextUpdateFrame -= samplesLeft.length
        if (this._nextUpdateFrame < 0) {
          this._nextUpdateFrame += this.intervalInFrames
          let volume = Math.max(this._leftVolume, this._rightVolume)
          if (!(volume > -1)) {
            if (this._leftVolume > -1) {
              volume = this._leftVolume
            } else if (this._rightVolume > -1) {
              volume = this._rightVolume
            }
          }
          if (samplesRight) {
            this.port.postMessage({
              left: this._leftVolume,
              right: this._rightVolume,
              volume: volume
            })
          } else {
            this.port.postMessage({
              volume: volume
            })
          }
        }
      }

      return true
    }
  }
)
