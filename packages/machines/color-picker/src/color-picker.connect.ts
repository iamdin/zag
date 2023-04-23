import { Color, ColorChannel, ColorFormat, normalizeColor } from "@zag-js/color-utils"
import { EventKeyMap, getEventKey, getEventStep, getNativeEvent, isLeftClick, isModifiedEvent } from "@zag-js/dom-event"
import { dataAttr } from "@zag-js/dom-query"
import { NormalizeProps, type PropTypes } from "@zag-js/types"
import { parts } from "./color-picker.anatomy"
import { dom } from "./color-picker.dom"
import {
  ColorAreaProps,
  ColorChannelInputProps,
  ColorChannelProps,
  ColorSwatchProps,
  Send,
  State,
} from "./color-picker.types"
import { getChannelDetails } from "./utils/get-channel-details"
import { getChannelDisplayColor } from "./utils/get-channel-display-color"
import { getChannelInputRange, getChannelInputValue } from "./utils/get-channel-input-value"
import { getColorAreaGradient } from "./utils/get-color-area-gradient"
import { getSliderBgImage } from "./utils/get-slider-background"

export function connect<T extends PropTypes>(state: State, send: Send, normalize: NormalizeProps<T>) {
  const valueAsColor = state.context.valueAsColor
  const isDisabled = state.context.disabled
  const isInteractive = state.context.isInteractive
  const isDragging = state.matches("dragging")

  const channels = valueAsColor.getColorChannels()

  return {
    /**
     * Whether the color picker is being dragged
     */
    isDragging,
    /**
     * The current color value (as a string)
     */
    value: state.context.value,
    /**
     * The current color value (as a Color object)
     */
    valueAsColor,
    /**
     * The current color channels of the color
     */
    channels,
    /**
     * Function to set the color value
     */
    setColor(value: string | Color) {
      send({ type: "VALUE.SET", value: normalizeColor(value), src: "set-color" })
    },
    /**
     * Function to set the color value of a specific channel
     */
    setChannelValue(channel: ColorChannel, value: number) {
      const color = valueAsColor.withChannelValue(channel, value)
      send({ type: "VALUE.SET", value: color, src: "set-channel" })
    },
    /**
     * Function to set the color format
     */
    setFormat(format: ColorFormat) {
      const value = valueAsColor.toFormat(format)
      send({ type: "VALUE.SET", value, src: "set-format" })
    },

    contentProps: normalize.element({
      ...parts.content.attrs,
      id: dom.getContentId(state.context),
    }),

    getAreaProps(props: ColorAreaProps) {
      const { xChannel, yChannel } = props
      const { areaStyles } = getColorAreaGradient(state.context, xChannel, yChannel)

      return normalize.element({
        ...parts.area.attrs,
        id: dom.getAreaId(state.context),
        role: "group",
        onPointerDown(event) {
          if (!isInteractive) return

          const evt = getNativeEvent(event)
          if (!isLeftClick(evt) || isModifiedEvent(evt)) return

          const point = { x: evt.clientX, y: evt.clientY }
          const channel = { xChannel, yChannel }

          send({ type: "AREA.POINTER_DOWN", point, channel, id: "area" })
        },
        style: {
          position: "relative",
          touchAction: "none",
          forcedColorAdjust: "none",
          ...areaStyles,
        },
      })
    },

    getAreaGradientProps(props: ColorAreaProps) {
      const { xChannel, yChannel } = props
      const { areaGradientStyles } = getColorAreaGradient(state.context, xChannel, yChannel)

      return normalize.element({
        ...parts.areaGradient.attrs,
        id: dom.getAreaGradientId(state.context),
        style: {
          position: "relative",
          touchAction: "none",
          forcedColorAdjust: "none",
          ...areaGradientStyles,
        },
      })
    },

    getAreaThumbProps(props: ColorAreaProps) {
      const { xChannel, yChannel } = props
      const { getThumbPosition } = getChannelDetails(valueAsColor, xChannel, yChannel)
      const { x, y } = getThumbPosition()

      const channel = { xChannel, yChannel }

      return normalize.element({
        ...parts.areaThumb.attrs,
        id: dom.getAreaThumbId(state.context),
        tabIndex: isDisabled ? undefined : 0,
        "data-disabled": dataAttr(isDisabled),
        role: "presentation",
        style: {
          position: "absolute",
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          transform: "translate(-50%, -50%)",
          touchAction: "none",
          forcedColorAdjust: "none",
          background: valueAsColor.withChannelValue("alpha", 1).toString("css"),
        },
        onBlur() {
          send("AREA.BLUR")
        },
        onKeyDown(event) {
          if (!isInteractive) return

          const step = getEventStep(event)

          const keyMap: EventKeyMap = {
            ArrowUp() {
              send({ type: "AREA.ARROW_UP", channel, step })
            },
            ArrowDown() {
              send({ type: "AREA.ARROW_DOWN", channel, step })
            },
            ArrowLeft() {
              send({ type: "AREA.ARROW_LEFT", channel, step })
            },
            ArrowRight() {
              send({ type: "AREA.ARROW_RIGHT", channel, step })
            },
            PageUp() {
              send({ type: "AREA.PAGE_UP", channel, step })
            },
            PageDown() {
              send({ type: "AREA.PAGE_DOWN", channel, step })
            },
          }

          const exec = keyMap[getEventKey(event, state.context)]

          if (exec) {
            exec(event)
            event.preventDefault()
          }
        },
      })
    },

    getChannelSliderTrackProps(props: ColorChannelProps) {
      const { orientation = "horizontal", channel } = props

      return normalize.element({
        ...parts.channelSliderTrack.attrs,
        id: dom.getChannelSliderTrackId(state.context, channel),
        role: "group",
        "data-channel": channel,
        "data-orientation": orientation,
        onPointerDown(event) {
          if (!isInteractive) return

          const evt = getNativeEvent(event)
          if (!isLeftClick(evt) || isModifiedEvent(evt)) return

          const point = { x: evt.clientX, y: evt.clientY }
          send({ type: "CHANNEL_SLIDER.POINTER_DOWN", channel, point, id: channel, orientation })
        },
        style: {
          position: "relative",
          touchAction: "none",
          forcedColorAdjust: "none",
          backgroundImage: getSliderBgImage(state.context, { orientation, channel }),
        },
      })
    },

    getChannelSliderBackgroundProps(props: ColorChannelProps) {
      const { orientation = "horizontal", channel } = props
      return normalize.element({
        ...parts.channelSliderTrackBg.attrs,
        "data-orientation": orientation,
        "data-channel": channel,
        style: {
          position: "absolute",
          backgroundColor: "#fff",
          backgroundImage: [
            "linear-gradient(-45deg,#0000 75.5%,#bcbcbc 75.5%)",
            "linear-gradient(45deg,#0000 75.5%,#bcbcbc 75.5%)",
            "linear-gradient(-45deg,#bcbcbc 25.5%,#0000 25.5%)",
            "linear-gradient(45deg,#bcbcbc 25.5%,#0000 25.5%)",
          ].join(","),
          backgroundSize: "16px 16px",
          backgroundPosition: "-2px -2px,-2px 6px,6px -10px,-10px -2px",
          inset: 0,
          zIndex: -1,
        },
      })
    },

    getChannelSliderThumbProps(props: ColorChannelProps) {
      const { orientation = "horizontal", channel } = props
      const { minValue, maxValue, step: stepValue } = valueAsColor.getChannelRange(channel)
      const channelValue = valueAsColor.getChannelValue(channel)

      const offset = (channelValue - minValue) / (maxValue - minValue)

      const placementStyles =
        orientation === "horizontal"
          ? { left: `${offset * 100}%`, top: "50%" }
          : { top: `${offset * 100}%`, left: "50%" }

      return normalize.element({
        ...parts.channelSliderThumb.attrs,
        id: dom.getChannelSliderThumbId(state.context, channel),
        role: "slider",
        "aria-label": channel,
        tabIndex: isDisabled ? undefined : 0,
        "data-channel": channel,
        "data-disabled": dataAttr(isDisabled),
        "data-orientation": orientation,
        "aria-disabled": dataAttr(isDisabled),
        "aria-orientation": orientation,
        "aria-valuemax": maxValue,
        "aria-valuemin": minValue,
        "aria-valuenow": channelValue,
        style: {
          forcedColorAdjust: "none",
          position: "absolute",
          background: getChannelDisplayColor(valueAsColor, channel).toString("css"),
          ...placementStyles,
        },
        onFocus() {
          if (!isInteractive) return
          send({ type: "CHANNEL_SLIDER.FOCUS", channel })
        },
        onBlur() {
          if (!isInteractive) return
          send({ type: "CHANNEL_SLIDER.BLUR", channel })
        },
        onKeyDown(event) {
          if (!isInteractive) return
          const step = getEventStep(event) * stepValue

          const keyMap: EventKeyMap = {
            ArrowUp() {
              send({ type: "CHANNEL_SLIDER.ARROW_UP", channel, step })
            },
            ArrowDown() {
              send({ type: "CHANNEL_SLIDER.ARROW_DOWN", channel, step })
            },
            ArrowLeft() {
              send({ type: "CHANNEL_SLIDER.ARROW_LEFT", channel, step })
            },
            ArrowRight() {
              send({ type: "CHANNEL_SLIDER.ARROW_RIGHT", channel, step })
            },
            PageUp() {
              send({ type: "CHANNEL_SLIDER.PAGE_UP", channel })
            },
            PageDown() {
              send({ type: "CHANNEL_SLIDER.PAGE_DOWN", channel })
            },
            Home() {
              send({ type: "CHANNEL_SLIDER.HOME", channel })
            },
            End() {
              send({ type: "CHANNEL_SLIDER.END", channel })
            },
          }

          const exec = keyMap[getEventKey(event, state.context)]

          if (exec) {
            exec(event)
            event.preventDefault()
          }
        },
      })
    },

    getChannelInputProps(props: ColorChannelInputProps) {
      const { channel } = props
      const isTextField = channel === "hex" || channel === "css"
      const range = getChannelInputRange(valueAsColor, channel)

      return normalize.input({
        ...parts.channelInput.attrs,
        type: isTextField ? "text" : "number",
        "data-channel": channel,
        "aria-label": channel,
        disabled: isDisabled,
        "data-disabled": dataAttr(isDisabled),
        readOnly: state.context.readOnly,
        id: dom.getChannelInputId(state.context, channel),
        defaultValue: getChannelInputValue(valueAsColor, channel),
        min: range?.minValue,
        max: range?.maxValue,
        step: range?.step,
        onFocus() {
          send({ type: "CHANNEL_INPUT.FOCUS", channel })
        },
        onChange(event) {
          if (isTextField) return
          const value = event.currentTarget.value
          send({ type: "CHANNEL_INPUT.CHANGE", channel, value, isTextField })
        },
        onBlur(event) {
          const value = event.currentTarget.value
          send({ type: "CHANNEL_INPUT.BLUR", channel, value, isTextField })
        },
        onKeyDown(event) {
          if (!isTextField) return
          if (event.key === "Enter") {
            const value = event.currentTarget.value
            send({ type: "CHANNEL_INPUT.CHANGE", channel, value, isTextField })
          }
        },
        style: {
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "textfield",
        },
      })
    },

    eyeDropperTriggerProps: normalize.button({
      ...parts.eyeDropTrigger.attrs,
      onClick() {
        send("EYEDROPPER.CLICK")
      },
    }),

    getSwatchBackgroundProps(props: ColorSwatchProps) {
      const { value } = props
      const alpha = normalizeColor(value).getChannelValue("alpha")
      return normalize.element({
        ...parts.swatchBg.attrs,
        "data-alpha": alpha,
        style: {
          width: "100%",
          height: "100%",
          background: "#fff",
          backgroundImage: [
            "linear-gradient(-45deg,#0000 75.5%,#bcbcbc 75.5%)",
            "linear-gradient(45deg,#0000 75.5%,#bcbcbc 75.5%)",
            "linear-gradient(-45deg,#bcbcbc 25.5%,#0000 25.5%)",
            "linear-gradient(45deg,#bcbcbc 25.5%,#0000 25.5%)",
          ].join(","),
          backgroundPosition: "-2px -2px,-2px 6px,6px -10px,-10px -2px",
          backgroundSize: "16px 16px",
          position: "absolute",
          inset: "0px",
          zIndex: -1,
        },
      })
    },

    getSwatchProps(props: ColorSwatchProps) {
      const { value, readOnly } = props
      const color = normalizeColor(value).toFormat(valueAsColor.getColorSpace())
      return normalize.element({
        ...parts.swatch.attrs,
        onClick() {
          if (readOnly) return
          send({ type: "VALUE.SET", value: color })
        },
        style: {
          position: "relative",
          background: color.toString("css"),
        },
      })
    },
  }
}