import Peardrop from './lib/peardrop.js'
import QRCode from 'qrcode'

// Tabs
const sendTabBtn = document.getElementById('send-tab-btn')
const receiveTabBtn = document.getElementById('receive-tab-btn')
const sendTab = document.getElementById('send-tab')
const receiveTab = document.getElementById('receive-tab')

function switchTab(tab) {
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

// Send logic
const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')
const dirInput = document.getElementById('dir-input')
const fileListEl = document.getElementById('file-list')
const qrContainer = document.getElementById('qr-container')
const sendBtn = document.getElementById('send-files')

let selectedFiles = []
let currentDrop = null

function updateFileList() {
  fileListEl.innerHTML = ''
  selectedFiles.forEach((file, i) => {
    const item = document.createElement('div')
    item.className = 'file-item'
    item.innerHTML = `<span>${file.name}</span>`
    const removeBtn = document.createElement('button')
    removeBtn.textContent = '🗑'
    removeBtn.onclick = () => {
      selectedFiles.splice(i, 1)
      updateFileList()
    }
    item.appendChild(removeBtn)
    fileListEl.appendChild(item)
  })
}

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.classList.add('dragover')
})
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'))
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('dragover')
  selectedFiles = [...selectedFiles, ...Array.from(e.dataTransfer.files)]
  updateFileList()
})

document.getElementById('pick-files').onclick = () => fileInput.click()
document.getElementById('pick-folder').onclick = () => dirInput.click()
fileInput.addEventListener('change', () => {
  selectedFiles = [...selectedFiles, ...Array.from(fileInput.files)]
  updateFileList()
})
dirInput.addEventListener('change', () => {
  selectedFiles = [...selectedFiles, ...Array.from(dirInput.files)]
  updateFileList()
})

sendBtn.onclick = () => sendItems(selectedFiles)

async function sendItems(items) {
  if (!items || items.length === 0) return
  const drop = new Peardrop()
  currentDrop = drop

  qrContainer.style.display = 'flex'
  qrContainer.innerHTML = ''

  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, drop.code, { width: 160 })
  qrContainer.appendChild(canvas)

  const phrase = document.createElement('div')
  phrase.textContent = drop.code
  phrase.style.fontSize = '16px'
  phrase.style.fontWeight = '600'
  phrase.style.letterSpacing = '1px'
  qrContainer.appendChild(phrase)

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = 'Cancel'
  cancelBtn.style.padding = '6px 12px'
  cancelBtn.style.background = '#ff5555'
  cancelBtn.style.color = '#fff'
  cancelBtn.style.border = 'none'
  cancelBtn.style.borderRadius = '6px'
  cancelBtn.style.cursor = 'pointer'
  cancelBtn.onclick = async () => {
    await drop.destroy()
    qrContainer.style.display = 'none'
  }
  qrContainer.appendChild(cancelBtn)

  drop.on('end', () => {
    qrContainer.style.display = 'none'
    selectedFiles = []
    updateFileList()
  })

  drop.on('error', (err) => {
    console.error('Beam error:', err)
    qrContainer.style.display = 'none'
  })

  drop.send(items)
}

// Receive
const phraseInput = document.getElementById('phrase-input')
const startReceiveBtn = document.getElementById('start-receive')
const receiveLog = document.getElementById('receive-log')

startReceiveBtn.onclick = () => {
  const phrase = phraseInput.value.trim().toUpperCase()
  if (!phrase) return alert('Enter a phrase')
  const drop = new Peardrop(phrase)
  currentDrop = drop
  receiveLog.textContent += `\n[waiting] Connecting with phrase ${phrase} ...`
  drop.on('data', (chunk) => {
    receiveLog.textContent += `\n[received] ${chunk.length} bytes`
  })
  drop.on('end', () => {
    receiveLog.textContent += '\n[done] Transfer completed → saved in Downloads'
    drop.destroy()
  })
  drop.on('error', (err) => {
    receiveLog.textContent += `\n[error] ${err.message}`
  })
}

