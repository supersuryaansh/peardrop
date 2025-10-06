
import Hyperbeam from 'hyperbeam'
import fs from 'fs'
import tar from 'tar-fs'
import path from 'path'
import QRCode from 'qrcode' // npm install qrcode
import { encode, decode } from 'hi-base32';
import uuid from 'uuid-v4'

const dropZone = document.getElementById("drop-zone")
const fileInput = document.getElementById("file-input")
const dirInput = document.getElementById("dir-input")

function logFiles(fileList) {
  for (const file of fileList) {
    const rel = file.webkitRelativePath || file.name
    console.log("→", rel)
  }
}

// Drag & drop events
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault()
  dropZone.classList.add("dragover")
})

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover")
})

dropZone.addEventListener("drop", (e) => {
  e.preventDefault()
  dropZone.classList.remove("dragover")
  const files = e.dataTransfer.files
  console.log("Dropped items:")
  logFiles(files)
  sendItems(files)
})

// Buttons
document.getElementById("pick-files").onclick = () => fileInput.click()
document.getElementById("pick-folder").onclick = () => dirInput.click()

fileInput.addEventListener("change", () => {
  console.log("Selected files:", fileInput.files)
  sendItems(fileInput.files)
})

dirInput.addEventListener("change", () => {
  console.log("Selected folder:", dirInput.files)
  sendItems(dirInput.files)
})

// --------------------
// Core function
// --------------------
function sendItems(items) {
  if (!items || items.length === 0) return

  const phrase = uuid().split('-').pop()
  const key = encode(phrase, true).replace(/=/g, '')
  const beam = new Hyperbeam(key, true)

  console.log("Phrase:", beam.key)
  showQrCode(phrase, beam)

  beam.on('end', () => {
    console.log('Transfer ended, destroying beam')
    beam.end()
    removeQrCode()
  })

  if (items[0].webkitRelativePath) {
    const rootFolder = items[0].webkitRelativePath.split('/')[0]
    const files = []

    for (const f of items) {
      const abs = Pear.media.getPathForFile(f)
      if (!abs) continue
      files.push({ abs, rel: f.webkitRelativePath })
    }

    console.log("Sending folder:", rootFolder)

    const pack = tar.pack('/', {
      entries: files.map(f => f.abs),
      map: header => {
        const file = files.find(f => f.abs.endsWith(header.name))
        if (file) header.name = file.rel
        return header
      }
    })

    pack.pipe(beam)

  } else {
    const files = []
    for (const f of items) {
      const abs = Pear.media.getPathForFile(f)
      if (!abs) continue
      files.push({ abs, rel: path.basename(abs) })
    }

    console.log("Sending files:", files.map(f => f.rel))

    const pack = tar.pack('/', {
      entries: files.map(f => f.abs),
      map: header => {
        const file = files.find(f => f.abs.endsWith(header.name))
        if (file) header.name = file.rel
        return header
      }
    })

    pack.pipe(beam)
  }
}

let qrModal = null
let currentBeam = null


async function showQrCode(key, beam) {
  currentBeam = beam // remember the active beam

  // Create modal overlay
  qrModal = document.createElement('div')
  qrModal.style.position = 'fixed'
  qrModal.style.top = 0
  qrModal.style.left = 0
  qrModal.style.width = '100%'
  qrModal.style.height = '100%'
  qrModal.style.background = 'rgba(0,0,0,0.8)'
  qrModal.style.display = 'flex'
  qrModal.style.alignItems = 'center'
  qrModal.style.justifyContent = 'center'
  qrModal.style.zIndex = 9999

  // Inner container
  const container = document.createElement('div')
  container.style.background = '#222'
  container.style.padding = '24px'
  container.style.borderRadius = '12px'
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.alignItems = 'center'
  container.style.gap = '16px'
  container.style.color = '#fff'
  container.style.position = 'relative'

  // Close button (X)
  const closeBtn = document.createElement('div')
  closeBtn.innerHTML = '&times;'
  closeBtn.style.position = 'absolute'
  closeBtn.style.top = '8px'
  closeBtn.style.right = '12px'
  closeBtn.style.fontSize = '24px'
  closeBtn.style.cursor = 'pointer'
  closeBtn.style.color = '#bbb'
  closeBtn.addEventListener('mouseover', () => (closeBtn.style.color = '#fff'))
  closeBtn.addEventListener('mouseout', () => (closeBtn.style.color = '#bbb'))
  closeBtn.addEventListener('click', () => {
    console.log('Transfer cancelled by user')
    if (currentBeam) {
      currentBeam.destroy() // destroy Hyperbeam
      currentBeam = null
    }
    removeQrCode()
  })
  container.appendChild(closeBtn)

  // QR code
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, key, { width: 300 })
  container.appendChild(canvas)

  // Phrase text
  const phraseText = document.createElement('div')
  phraseText.innerText = key.toUpperCase()
  phraseText.style.fontSize = '18px'
  phraseText.style.fontWeight = 'bold'
  phraseText.style.letterSpacing = '2px'
  container.appendChild(phraseText)

  // Copy button
  const copyBtn = document.createElement('button')
  copyBtn.innerText = 'COPY CODE'
  copyBtn.style.padding = '8px 16px'
  copyBtn.style.border = 'none'
  copyBtn.style.borderRadius = '6px'
  copyBtn.style.background = '#3399ff'
  copyBtn.style.color = '#fff'
  copyBtn.style.cursor = 'pointer'
  copyBtn.style.fontSize = '14px'
  copyBtn.style.fontWeight = 'bold'
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(key.toUpperCase())
    copyBtn.innerText = 'COPIED!'
    setTimeout(() => (copyBtn.innerText = 'COPY CODE'), 2000)
  })
  container.appendChild(copyBtn)

  qrModal.appendChild(container)
  document.body.appendChild(qrModal)
}

function removeQrCode() {
  if (qrModal) {
    qrModal.remove()
    qrModal = null
  }
  if (currentBeam) {
    currentBeam.end()
    currentBeam = null
  }
}

