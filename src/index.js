const {ipcRenderer} = require('electron');
const canvas = document.querySelector('#canvas');
const canvas_back = document.querySelector('#canvas-back');
const imagenum_range = document.querySelector('#imagenum');
const imagenum_text = document.querySelector('#imagenum-text');

const MAX_CANVAS_SIZE = 16384
const W = 512
const H = 512
const MAX_IMG_NUM = Math.floor(MAX_CANVAS_SIZE / W * MAX_CANVAS_SIZE / H)
const ROW_IMG = Math.floor(MAX_CANVAS_SIZE / W)
const RENDER_IMAGE_SPAN = 10 // ms
let ScrollDelta = 53

canvas_back.width = MAX_CANVAS_SIZE
canvas_back.height = MAX_CANVAS_SIZE

let rawdata = null
let ctx_back = canvas_back.getContext('2d')

let image_id = 0
let image_num = 0
let is_renderer = null
let renderer_promise = null

function prerender(z, wait) {
  return new Promise((resolve, reject) => {
    if (z >= image_num) {
      resolve()
      return
    }

    if (rawdata === null) {
      resolve()
      return
    }

    setTimeout(() => {
      if (is_renderer[z]) {
        resolve()
        return
      }
      is_renderer[z] = true;

      const offset_x = (z % ROW_IMG) * W
      const offset_y = Math.floor(z / ROW_IMG) * H;
      const offset = z * W * H

      let mn = 65536
      let mx = -65536
      for (let y = 0; y < H; ++y) {
        for (let x = 0; x < W; ++x) {
          let val = rawdata[y * W + x + offset]
          mn = Math.min(mn, val)
          mx = Math.max(mx, val)
        }
      }

      if (mx == mn) mx = mn + 1
      let scale = 255. / (mx - mn);
      for (let y = 0; y < H; ++y) {
        for (let x = 0; x < W; ++x) {
          let val = rawdata[y * W + x + offset]
          val = Math.floor((val - mn) * scale)
          ctx_back.fillStyle = `rgb(${val}, ${val}, ${val})`
          ctx_back.fillRect(x + offset_x, y + offset_y, 1, 1)
        }
      }
      resolve()
    }, wait)
  })
}

function prerender_all(start, wait, img_num, data) {
  if (start == img_num || rawdata !== data) return new Promise((r, c) => {})

  return prerender(start, wait).then(() => {
    prerender_all(start + 1, wait, img_num, data)
  })
}

function draw_image() {
  if (rawdata === null) return

  prerender(image_id, 0).then(() => {
    const W = 512
    const H = 512
    const offset_x = image_id % ROW_IMG
    const offset_y = Math.floor(image_id / ROW_IMG);
    let ctx = canvas.getContext('2d')
    ctx.drawImage(canvas_back, offset_x * W, offset_y * H, W, H, 0, 0, W, H)
  })
}

function process_data(data) {
  if (data.status === undefined) {
    return false
  }
  if (!data.status) {
    alert('Cannot open file\n${data.message}')
    return false
  }

  const buf16 = new Int16Array(data.buff.buffer)
  image_id = 0
  rawdata = buf16
  
  image_num = Math.floor(rawdata.length / 512 / 512)
  imagenum_range.max = image_num - 1
  imagenum_range.style.width = Math.floor(Math.min(512, image_num * 5)) + "px"

  if (image_num > MAX_IMG_NUM) {
    alert(`sorry. max image num = ${MAX_IMG_NUM}`)
    image_num = MAX_IMG_NUM
  }

  is_renderer = new Array(image_num)
  is_renderer.fill(false)
  prerender_all(0, RENDER_IMAGE_SPAN, image_num, rawdata)

  draw_image()
}

document.querySelector('#openFile').addEventListener('click', () => {
  ipcRenderer.invoke('file-open')
    .then((data) => {
      process_data(data)
    })
    .catch((err) => {
      alert(err)
    })
})

document.querySelector('#image-frame').addEventListener('wheel', (event) => {
  if (event.deltaY === 0) return

  ScrollDelta = Math.min(ScrollDelta, Math.abs(event.deltaY))
  const dy = event.deltaY / ScrollDelta
  let delta = (dy > 0 ? Math.ceil(dy) : dy < 0 ? -Math.ceil(-dy) : 0);
  // console.log(event.deltaY, delta)
  let new_image_id = image_id + delta
  if (new_image_id < imagenum_range.min + 0) new_image_id = parseInt(imagenum_range.min)
  if (new_image_id >= image_num) new_image_id = parseInt(image_num - 1)

  if (new_image_id === image_id) return
  image_id = new_image_id

  imagenum_range.value = image_id.toString()
  imagenum_text.innerHTML = image_id.toString()
  draw_image()
})

document.querySelector('#imagenum').addEventListener('input', (event) => {
  image_id = parseInt(event.target.value)
  imagenum_range.value = image_id.toString()
  imagenum_text.innerHTML = image_id.toString()
  draw_image()
})

ipcRenderer.on('asynchronous-message', (event, msg) => {
  if (msg.status) {
    process_data(msg)
  }
  else {
    alert(msg.message)
  }
})