import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import { CreditCard, BellRinging, TelegramLogo } from 'phosphor-react-native'
import { typography } from '../../lib/constants'
import { CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS, donationColors as dc } from './donationTheme'

const BOT_URL = 'https://t.me/Sahifalab_hub_bot'

export default function EmptyMethods() {
  const [subscribed, setSubscribed] = useState(false)

  return (
    <View style={s.wrap}>
      <View style={s.box}>
        <Text style={s.watermark} allowFontScaling={false}>S</Text>
        <View style={s.tile}>
          <CreditCard size={24} color="#fff" weight="fill" />
        </View>
        <Text style={s.title}>To'lov usullari hozircha yo'q</Text>
        <Text style={s.body}>
          Karta rekvizitlari tez orada qo'shiladi. Xohlasangiz, xabar berishimiz mumkin.
        </Text>
      </View>

      <View style={s.buttons}>
        <Pressable
          onPress={() => setSubscribed(true)}
          disabled={subscribed}
          style={[s.primaryBtn, subscribed && { opacity: 0.6 }]}
        >
          <BellRinging size={16} color="#fff" weight="bold" />
          <Text style={s.primaryBtnText}>
            {subscribed ? 'Xabar berish yoqildi' : "Tayyor bo'lganda xabar bering"}
          </Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(BOT_URL)} style={s.outlineBtn}>
          <TelegramLogo size={16} color={dc.navy} weight="bold" />
          <Text style={s.outlineBtnText}>Telegram kanalimiz</Text>
        </Pressable>
      </View>

      <View style={s.altHelp}>
        <Text style={s.altLabel} allowFontScaling={false}>SHU PAYTDA HAM YORDAM BERISH MUMKIN</Text>
        <Text style={s.altBody}>
          Ilovani do'stlaringizga ulashing yoki Play Marketda sharh qoldiring — bu ham katta yordam.
        </Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 16 },
  box: {
    width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: CARD_RADIUS,
    backgroundColor: dc.surface2, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(43,59,77,.18)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 20,
  },
  watermark: {
    position: 'absolute', right: -30, bottom: -50, fontSize: 170, lineHeight: 170,
    color: 'rgba(43,59,77,.05)', fontFamily: typography.fontFamily.extrabold,
  },
  tile: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: dc.navy,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  title: { fontSize: 14, fontFamily: typography.fontFamily.bold, color: dc.navy, textAlign: 'center' },
  body: { marginTop: 4, fontSize: 12, lineHeight: 12 * 1.5, color: dc.textMuted, textAlign: 'center' },
  buttons: { width: '100%', maxWidth: 280, gap: 8 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: dc.accent, borderRadius: 999, paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: typography.fontFamily.bold },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(43,59,77,.18)', borderRadius: 999, paddingVertical: 13,
  },
  outlineBtnText: { color: dc.navy, fontSize: 14, fontFamily: typography.fontFamily.bold },
  altHelp: { backgroundColor: dc.surface2, borderRadius: 22, padding: 16, width: '100%' },
  altLabel: { fontSize: 9.5, fontFamily: typography.fontFamily.bold, letterSpacing: 0.16 * 9.5, color: dc.textFaint, marginBottom: 8 },
  altBody: { fontSize: 13, lineHeight: 13 * 1.5, color: dc.textBody, fontFamily: typography.fontFamily.medium },
})
