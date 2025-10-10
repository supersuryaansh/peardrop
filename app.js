import Peardrop from './lib/peardrop.js'
import QRCode from 'qrcode'

// ------------------
// Tab Switching
// ------------------
const sendTabBtn = document.getElementById('send-tab-btn')
const receiveTabBtn = document.getElementById('receive-tab-btn')
const sendTab = document.getElementById('send-tab')
const receiveTab = document.getElementById('receive-tab')

function switchTab (tab) {
  if (tab === 'send') {
    sendTabBtn.classList.add('active')
    receiveTabBtn.classList.remove('active')
    sendTab.classList.add('active')
    receiveTab.classList.remove('active')
  } else {
    receiveTabBtn.classList.add('active')
    sendTabBtn.classList.remove('active')
    receiveTab.classList.add('active')
    sendTab.classList.remove('active')
  }
}
sendTabBtn.onclick = () => switchTab('send')
receiveTabBtn.onclick = () => switchTab('receive')

// ------------------
// SEND LOGIC
// ------------------
const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')
const dirInput = document.getElementById('dir-input')

let qrModal = null
let currentDrop = null

function logFiles (fileList) {
  for (const file of fileList) {
    const rel = file.webkitRelativePath || file.name
    console.log('→', rel)
  }
}

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.classList.add('dragover')
})
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'))
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('dragover')
  const files = e.dataTransfer.files
  console.log('Dropped items:')
  logFiles(files)
  sendItems(files)
})

document.getElementById('pick-files').onclick = () => fileInput.click()
document.getElementById('pick-folder').onclick = () => dirInput.click()
fileInput.addEventListener('change', () => sendItems(fileInput.files))
dirInput.addEventListener('change', () => sendItems(dirInput.files))

async function sendItems (items) {
  if (!items || items.length === 0) return

  const drop = new Peardrop() // sender mode (no code passed)
  currentDrop = drop

  console.log('Generated phrase:', drop.code)
  showQrCode(drop.code, drop)

  drop.beam.on('end', () => {
    console.log('Transfer ended')
    removeQrCode()
  })

  drop.beam.on('error', (err) => {
    console.error('Beam error:', err)
    removeQrCode()
  })

  drop.send(items)
}

// ------------------
// QR Popup
// ------------------
async function showQrCode (code, drop) {
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

  const container = document.createElement('div')
  container.style.background = '#222'
  container.style.padding = '40px'
  container.style.borderRadius = '12px'
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.alignItems = 'center'
  container.style.gap = '16px'
  container.style.color = '#fff'
  container.style.position = 'relative'

  // Close button
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
  closeBtn.addEventListener('click', async () => {
    console.log('Transfer cancelled by user')
    if (drop) await drop.destroy()
    removeQrCode()
  })
  container.appendChild(closeBtn)

  // QR code
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, code, { width: 300 })
  container.appendChild(canvas)

  // Phrase text
  const phraseText = document.createElement('div')
  phraseText.innerText = code
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
    navigator.clipboard.writeText(code)
    copyBtn.innerText = 'COPIED!'
    setTimeout(() => (copyBtn.innerText = 'COPY CODE'), 2000)
  })
  container.appendChild(copyBtn)

  qrModal.appendChild(container)
  document.body.appendChild(qrModal)
}

function removeQrCode () {
  if (qrModal) {
    qrModal.remove()
    qrModal = null
  }
  if (currentDrop) {
    currentDrop.destroy()
    currentDrop = null
  }
}

// ------------------
// RECEIVE LOGIC
// ------------------
const phraseInput = document.getElementById('phrase-input')
const startReceiveBtn = document.getElementById('start-receive')
const receiveLog = document.getElementById('receive-log')

startReceiveBtn.onclick = () => {
  const phrase = phraseInput.value.trim().toUpperCase()
  if (!phrase) return alert('Enter a phrase')

  const drop = new Peardrop(phrase) // receiver mode (pass code)
  currentDrop = drop
  receiveLog.textContent += `\n[waiting] Connecting with phrase ${phrase} ...`

  drop.event.on('progress', (msg) => {
    receiveLog.textContent += `\n${msg}`
  })

  drop.beam.on('data', (chunk) => {
    receiveLog.textContent += `\n[received] ${chunk.length} bytes`
  })

  drop.beam.on('end', () => {
    receiveLog.textContent += '\n[done] Transfer completed → saved in Downloads'
  })

  drop.beam.on('error', (err) => {
    receiveLog.textContent += `\n[error] ${err.message}`
  })
}
