import { getEventKey, getNativeEvent, type EventKeyMap } from "@zag-js/dom-event"
import { dataAttr, isSafari, isSelfTarget } from "@zag-js/dom-query"
import type { NormalizeProps, PropTypes } from "@zag-js/types"
import { parts } from "./tabs.anatomy"
import { dom } from "./tabs.dom"
import type { MachineApi, Send, State, TriggerProps, TriggerState } from "./tabs.types"

export function connect<T extends PropTypes>(state: State, send: Send, normalize: NormalizeProps<T>): MachineApi<T> {
  const translations = state.context.translations
  const focused = state.matches("focused")

  function getTriggerState(props: TriggerProps): TriggerState {
    return {
      selected: state.context.value === props.value,
      focused: state.context.focusedValue === props.value,
      disabled: !!props.disabled,
    }
  }

  return {
    value: state.context.value,
    focusedValue: state.context.focusedValue,
    setValue(value) {
      send({ type: "SET_VALUE", value })
    },
    clearValue() {
      send({ type: "CLEAR_VALUE" })
    },
    setIndicatorRect(value) {
      const id = dom.getTriggerId(state.context, value)
      send({ type: "SET_INDICATOR_RECT", id })
    },
    getTriggerState,

    rootProps: normalize.element({
      ...parts.root.attrs,
      id: dom.getRootId(state.context),
      "data-orientation": state.context.orientation,
      "data-focus": dataAttr(focused),
      dir: state.context.dir,
    }),

    listProps: normalize.element({
      ...parts.list.attrs,
      id: dom.getListId(state.context),
      role: "tablist",
      dir: state.context.dir,
      "data-focus": dataAttr(focused),
      "aria-orientation": state.context.orientation,
      "data-orientation": state.context.orientation,
      "aria-label": translations.listLabel,
      onKeyDown(event) {
        if (event.defaultPrevented) return
        const evt = getNativeEvent(event)
        if (!isSelfTarget(evt)) return

        const keyMap: EventKeyMap = {
          ArrowDown() {
            send("ARROW_DOWN")
          },
          ArrowUp() {
            send("ARROW_UP")
          },
          ArrowLeft() {
            send("ARROW_LEFT")
          },
          ArrowRight() {
            send("ARROW_RIGHT")
          },
          Home() {
            send("HOME")
          },
          End() {
            send("END")
          },
          Enter() {
            send({ type: "ENTER", value: state.context.focusedValue })
          },
        }

        let key = getEventKey(event, state.context)
        const exec = keyMap[key]

        if (exec) {
          event.preventDefault()
          exec(event)
        }
      },
    }),

    getTriggerProps(props) {
      const { value, disabled } = props
      const triggerState = getTriggerState(props)

      return normalize.button({
        ...parts.trigger.attrs,
        role: "tab",
        type: "button",
        disabled,
        dir: state.context.dir,
        "data-orientation": state.context.orientation,
        "data-disabled": dataAttr(disabled),
        "aria-disabled": disabled,
        "data-value": value,
        "aria-selected": triggerState.selected,
        "data-selected": dataAttr(triggerState.selected),
        "data-focus": dataAttr(triggerState.focused),
        "aria-controls": dom.getContentId(state.context, value),
        "data-ownedby": dom.getListId(state.context),
        id: dom.getTriggerId(state.context, value),
        tabIndex: triggerState.selected ? 0 : -1,
        onFocus() {
          send({ type: "TAB_FOCUS", value })
        },
        onBlur(event) {
          const target = event.relatedTarget as HTMLElement | null
          if (target?.getAttribute("role") !== "tab") {
            send({ type: "TAB_BLUR" })
          }
        },
        onClick(event) {
          if (event.defaultPrevented) return
          if (disabled) return
          if (isSafari()) {
            event.currentTarget.focus()
          }
          send({ type: "TAB_CLICK", value })
        },
      })
    },

    getContentProps(props) {
      const { value } = props
      const selected = state.context.value === value
      return normalize.element({
        ...parts.content.attrs,
        dir: state.context.dir,
        id: dom.getContentId(state.context, value),
        tabIndex: 0,
        "aria-labelledby": dom.getTriggerId(state.context, value),
        role: "tabpanel",
        "data-ownedby": dom.getListId(state.context),
        "data-selected": dataAttr(selected),
        "data-orientation": state.context.orientation,
        hidden: !selected,
      })
    },

    indicatorProps: normalize.element({
      id: dom.getIndicatorId(state.context),
      ...parts.indicator.attrs,
      dir: state.context.dir,
      "data-orientation": state.context.orientation,
      style: {
        "--transition-property": "left, right, top, bottom, width, height",
        "--left": state.context.indicatorRect?.left,
        "--top": state.context.indicatorRect?.top,
        "--width": state.context.indicatorRect?.width,
        "--height": state.context.indicatorRect?.height,
        position: "absolute",
        willChange: "var(--transition-property)",
        transitionProperty: "var(--transition-property)",
        transitionDuration: state.context.canIndicatorTransition ? "var(--transition-duration, 150ms)" : "0ms",
        transitionTimingFunction: "var(--transition-timing-function)",
        [state.context.orientation === "horizontal" ? "left" : "top"]:
          state.context.orientation === "horizontal" ? "var(--left)" : "var(--top)",
      },
    }),
  }
}
