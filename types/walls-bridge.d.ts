// types/walls-bridge.d.ts
export {}

declare global {
  interface Window {
    WallsApp?: {
      getFcmToken: () => string
      getSubscribedChannels?: () => string[]
    }
  }
}