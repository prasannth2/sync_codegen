export const validateJSON = (json: string) => {
  if (!json.trim()) return false
  try { JSON.parse(json); return true } catch { return false }
}

export const beautifyJSON = (json: string) => {
  try { return JSON.stringify(JSON.parse(json), null, 2) }
  catch { return json }
}

export const copyToClipboard = async (content: string) => {
  await navigator.clipboard.writeText(content)
}
