
import Hyperbeam from 'hyperbeam'
import fs from 'fs'
import tar from 'tar-fs'
import path from 'path'

// Setup Hyperbeam
const beam = new Hyperbeam('kikl4zhud7cpgbzdgpwzzrvxnneaggekxr6cj3qbjzv2tras2saq', true)
console.log('Beam key:', beam.key)

// Handle clicks on the h1 just for demo
document.querySelector('h1').addEventListener('click', (e) => {
  e.target.innerHTML = '🍐'
})

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

// Send files/folders via Hyperbeam

function sendItems(items) {
  if (!items || items.length === 0) return

  if (items[0].webkitRelativePath) {
    // Folder selection
    const rootFolder = items[0].webkitRelativePath.split('/')[0]
    const files = []

    for (const f of items) {
      const abs = Pear.media.getPathForFile(f)
      if (!abs) continue
      files.push({ abs, rel: f.webkitRelativePath }) // store both
    }

    console.log("Sending folder:", rootFolder)

    const pack = tar.pack('/', {
      entries: files.map(f => f.abs), // use abs paths so tar can read them
      map: header => {
        const file = files.find(f => f.abs.endsWith(header.name))
        if (file) header.name = file.rel // rewrite to relative path
        return header
      }
    })

    pack.pipe(beam)

  } else {
    // Individual files
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
