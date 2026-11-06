import { useState } from 'react'
import i18n from '../i18n'

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState(i18n.language)

  async function handleChange(nextLanguage: string) {
    await i18n.changeLanguage(nextLanguage)
    setLanguage(nextLanguage)
  }

  return (
    <label className="language-switcher">
      <span>{i18n.t("Language")}</span>
      <select
        value={language}
        onChange={(event) => void handleChange(event.target.value)}
        aria-label={i18n.t("Language")}
      >
        <option value="en">{i18n.t("English")}</option>
        <option value="pt-BR">{i18n.t("Português (Brasil)")}</option>
      </select>
    </label>
  )
}
