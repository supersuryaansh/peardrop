import Hyperbeam from 'hyperbeam'
import fs from 'fs'
import tar from 'tar-fs'
import path from 'path'
import QRCode from 'qrcode'
import base32 from 'hi-base32'
import uuid from 'uuid-v4'
import EventEmitter from 'events'

class Peardrop extends EventEmitter {
  constructor (code) {
    super()
    this.sender = !code
    this._code = code

    let key
    if (this.sender) {
      this._code = uuid().split('-').pop().toUpperCase()
      key = base32.encode(this._code, true).replace(/=/g, '')
    } else {
      key = base32.encode(this._code, true).replace(/=/g, '')
    }

    this.beam = new Hyperbeam(key, this.sender)
    this._listeners()
    if (!this.sender) {
      this._receive()
    }
  }

  _listeners () {
    this.beam.on('end', () => {
      console.log('emitted from peardrive')
      this.emit('end', 'test')
    })

    this.beam.on('error', (err) => {
      this.emit('error', err)
    })

    if (!this.sender) {
      this.beam.on('data', (chunk) => {
        this.emit('data', chunk)
      })
    }
  }

  send (items) {
    let rootFolder
    if (items[0].webkitRelativePath) {
      rootFolder = items[0].webkitRelativePath.split('/')[0]
    }

    const files = []
    for (const f of items) {
      const abs = Pear.media.getPathForFile(f)
      if (!abs) continue
      if (rootFolder) {
        files.push({ abs, rel: f.webkitRelativePath })
      } else {
        files.push({ abs, rel: path.basename(abs) })
      }
    }

    const pack = tar.pack('/', {
      entries: files.map(f => f.abs),
      map: header => {
        const file = files.find(f => f.abs.endsWith(header.name))
        if (file) header.name = file.rel
        return header
      }
    })
    pack.pipe(this.beam)
  }

  _receive () {
    const downloads = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads')
    if (!fs.existsSync(downloads)) fs.mkdirSync(downloads, { recursive: true })

    const extract = tar.extract(downloads)
    this.beam.pipe(extract)
  }

  get code () {
    return this._code
  }

  async destroy () {
    if (this.beam) {
      if (!this.sender) {
        this.beam.end()
      }
      this.beam.destroy()
    }
    this.beam = null
  }
}

export default Peardrop
