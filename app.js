import Peardrop from './lib/peardrop.js'
import QRCode from 'qrcode'
import os from 'os'

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
// Send Logic
// ------------------
const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')
const dirInput = document.getElementById('dir-input')
const fileListEl = document.getElementById('file-list')
const qrContainer = document.getElementById('qr-container')
const sendBtn = document.getElementById('send-files')
const chooser = document.getElementById('chooser')

let selectedFiles = []
let currentDrop = null

function updateFileList () {
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

async function sendItems (items) {
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
    const buttons = document.querySelectorAll('.file-item button')
    buttons.forEach(button => { button.style.display = 'inline' })
    chooser.style.display = 'flex'
  }
  qrContainer.appendChild(cancelBtn)

  chooser.style.display = 'none'
  const buttons = document.querySelectorAll('.file-item button')
  buttons.forEach(button => { button.style.display = 'none' })

  drop.on('end', () => {
    qrContainer.style.display = 'none'
    selectedFiles = []
    updateFileList()
    chooser.style.display = 'flex'
  })

  drop.on('error', (err) => {
    console.error('Beam error:', err)
    qrContainer.style.display = 'none'
    chooser.style.display = 'flex'
  })

  drop.send(items)
}

// ------------------
// Receive Logic
// ------------------
const phraseInput = document.getElementById('phrase-input')
const startReceiveBtn = document.getElementById('start-receive')
const receiveLog = document.getElementById('receive-log')

// Hidden folder picker for choosing download location
const folderPicker = document.createElement('input')
folderPicker.type = 'file'
folderPicker.webkitdirectory = true
folderPicker.hidden = true
document.body.appendChild(folderPicker)

startReceiveBtn.onclick = async () => {
  const phrase = phraseInput.value.trim().toUpperCase()
  if (!phrase) return alert('Enter a phrase')

  // Ask user whether to choose a custom download folder
  const choose = confirm('Would you like to choose a custom download folder?')
  let downloadPath = null

  if (choose) {
    const folderPromise = new Promise((resolve) => {
      folderPicker.onchange = (e) => {
        const firstFile = e.target.files[0]
        if (firstFile) {
          // Derive the folder path from first file's webkitRelativePath
          const fakePath = firstFile.webkitRelativePath.split('/')[0]
          resolve(fakePath)
        } else resolve(null)
      }
    })
    folderPicker.click()
    downloadPath = await folderPromise
  }

  const drop = new Peardrop(phrase)
  currentDrop = drop

  if (downloadPath) {
    drop.setDownloadLocation(downloadPath)
    receiveLog.textContent += `\n[info] Saving files to ${downloadPath}`
  } else {
    receiveLog.textContent += `\n[info] Saving files to default Downloads folder`
  }

  receiveLog.textContent += `\n[waiting] Connecting with phrase ${phrase} ...`

  drop.on('data', (chunk) => {
    receiveLog.textContent += `\n[received] ${chunk.length} bytes`
  })

  drop.on('end', () => {
    receiveLog.textContent += '\n[done] Transfer completed'
    drop.destroy()
  })

  drop.on('error', (err) => {
    receiveLog.textContent += `\n[error] ${err.message}`
  })
}

// ------------------
// General app logic
// ------------------
document.getElementById('bar').textContent = os.hostname()
