const TOKEN = 'auth_token'

export const setToken = (token: string) => window.localStorage.setItem(TOKEN, token)

export const getToken = () => window.localStorage.getItem(TOKEN)

export const removeToken = () => window.localStorage.removeItem(TOKEN)
