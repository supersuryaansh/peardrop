
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
  showQrCode(phrase)

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

async function showQrCode(key) {
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

  const canvas = document.createElement('canvas')
  qrModal.appendChild(canvas)
  document.body.appendChild(qrModal)

  await QRCode.toCanvas(canvas, key, { width: 300 })
}

function removeQrCode() {
  if (qrModal) {
    qrModal.remove()
    qrModal = null
  }
}
