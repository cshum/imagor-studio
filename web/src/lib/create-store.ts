import { useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Creates a store with state management and React integration
 *
 * @template S - State type
 * @template A - Action type
 * @param initialState - Initial state of the store
 * @param reducer - Synchronous reducer function to process actions and return new state
 * @returns Store object with methods to interact with the store
 */
export function createStore<S, A>(initialState: S, reducer: (state: S, action: A) => S) {
  // Store state in memory
  let state = initialState

  // Array of listener callbacks
  const listeners: Array<(state: S, action: A) => void> = []

  /**
   * Subscribe to state changes
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function
   */
  const subscribe = (callback: (state: S, action: A) => void) => {
    listeners.push(callback)
    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get current state
   * @returns Current state
   */
  const getState = () => state

  /**
   * Dispatch an action to update state
   * @param action - Action to dispatch
   * @returns Updated state
   */
  const dispatch = (action: A): S => {
    state = reducer({ ...state }, action)
    // Notify all listeners - create a copy of the listeners array
    // to avoid issues when listener unsubscribe during dispatch
    const listenersCopy = Array.from(listeners)
    for (const listener of listenersCopy) {
      listener(state, action)
    }
    return state
  }

  /**
   * Waits for a specific condition in the state to be true
   *
   * @param fn - Predicate function that checks if the condition is met
   * @returns Promise that resolves with the state when the condition is met
   *
   * @example
   * // Wait for auth to be initialized
   * await authStore.waitFor(state => state.initialized)
   */
  const waitFor = async (fn: (state: S) => boolean): Promise<S> => {
    if (fn(state)) {
      return Promise.resolve(state)
    }
    return new Promise((resolve) => {
      if (fn(state)) {
        return resolve(state)
      }
      const listener = (s: S) => {
        if (fn(s)) {
          unsubscribe()
          resolve(s)
        }
      }
      const unsubscribe = subscribe(listener)
    })
  }

  /**
   * React hook to access store state and methods
   * @returns Store state
   */
  const useStore = () => {
    return useSyncExternalStore(subscribe, getState)
  }

  /**
   * React hook to subscribe to store changes
   * @param callback - Function to call when state changes
   */
  const useStoreEffect = (callback: (state: S, action: A) => void) => {
    const callbackRef = useRef(callback)

    useEffect(() => {
      callbackRef.current = callback
    }, [callback])

    useEffect(() => {
      return subscribe((state, action) => {
        callbackRef.current(state, action)
      })
    }, [])
  }

  return {
    getState,
    dispatch,
    subscribe,
    waitFor,
    useStore,
    useStoreEffect,
  }
}
