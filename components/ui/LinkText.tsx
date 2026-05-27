import React from 'react'
import { Text, Linking, StyleProp, TextStyle } from 'react-native'

const URL_RE = /https?:\/\/[^\s]+|www\.[^\s]+/g

interface Props {
  children: string
  style?: StyleProp<TextStyle>
  linkColor: string
  numberOfLines?: number
}

export function LinkText({ children, style, linkColor, numberOfLines }: Props) {
  if (!children) return null

  const parts: { text: string; isLink: boolean }[] = []
  let last = 0

  for (const match of children.matchAll(URL_RE)) {
    if (match.index! > last) {
      parts.push({ text: children.slice(last, match.index), isLink: false })
    }
    parts.push({ text: match[0], isLink: true })
    last = match.index! + match[0].length
  }
  if (last < children.length) {
    parts.push({ text: children.slice(last), isLink: false })
  }

  if (parts.length === 0) {
    return <Text style={style} numberOfLines={numberOfLines}>{children}</Text>
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.isLink ? (
          <Text
            key={i}
            style={{ color: linkColor }}
            onPress={() => {
              const url = p.text.startsWith('http') ? p.text : `https://${p.text}`
              Linking.openURL(url)
            }}
          >
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        )
      )}
    </Text>
  )
}
