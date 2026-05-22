import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

type LegalSection = {
  title: string
  body: string
}

export function LegalDocumentScreen({
  eyebrow,
  title,
  updatedAt,
  intro,
  sections,
}: {
  eyebrow: string
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.updatedAt}>Последна актуализация: {updatedAt}</Text>
      <Text style={styles.intro}>{intro}</Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 42,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  updatedAt: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  intro: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 18,
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionBody: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
})