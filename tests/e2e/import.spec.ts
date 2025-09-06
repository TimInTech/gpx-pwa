import { test, expect } from '@playwright/test'

const GPX_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>E2E Track</name>
    <trkseg>
      <trkpt lat="51.0" lon="8.0" />
      <trkpt lat="51.1" lon="8.1" />
    </trkseg>
  </trk>
</gpx>`

test('Upload → Erfolg → Map sichtbar', async ({ page }) => {
  await page.goto('/')

  // Wechsel zur Import-Ansicht
  await page.getByRole('button', { name: 'Import' }).click()

  // Datei wählen und hochladen
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Dateien auswählen' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({ name: 'e2e.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX_CONTENT) })

  // Verarbeiten starten
  const processButton = page.getByRole('button', { name: 'Verarbeiten' })
  await processButton.click()

  // Auf erfolgreichen Status warten
  await expect(page.getByText('Erfolgreich')).toBeVisible({ timeout: 15000 })

  // Speichern anklicken
  const saveButton = page.getByRole('button', { name: /Speichern/ })
  await saveButton.click()

  // Nach dem Speichern wechselt die Ansicht zur Karte
  // Prüfe, ob Leaflet-Container existiert (Map sichtbar/initialisiert)
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 })
})

