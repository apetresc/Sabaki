import {readFileSync} from 'fs'
import {decode} from 'iconv-lite'
import {detect} from 'jschardet'
import {fromDimensions} from '@sabaki/go-board'
import i18n from '../../i18n.js'
import * as gametree from '../gametree.js'

const t = i18n.context('fileformats')

export const meta = {
  name: t('PandaNET UGF'),
  extensions: ['ugf', 'ugi']
}

function convertVertex(ugiVertex, boardSize) {
  return (
    ugiVertex[0] +
    String.fromCharCode(boardSize - ugiVertex.charCodeAt(1) + 129)
  ).toLowerCase()
}

export function parse(content) {
  return [
    gametree.new().mutate(draft => {
      let lines = content.split('\n')
      let rootId = draft.root.id
      let lastNodeId = rootId

      draft.updateProperty(rootId, 'CA', ['UTF-8'])
      draft.updateProperty(rootId, 'FF', ['4'])
      draft.updateProperty(rootId, 'GM', ['1'])
      draft.updateProperty(rootId, 'SZ', ['19'])

      let currentMode = null
      for (let n = 0; n < lines.length; n++) {
        let line = lines[n].trim()

        if (line == '') {
          continue
        } else if (line.startsWith('[') && line.endsWith(']')) {
          currentMode = line.slice(1, -1)
          continue
        }

        switch (currentMode) {
          case 'Header':
            let [key, value] = line.split('=')
            switch (key) {
              case 'PlayerB':
                draft.updateProperty(rootId, 'PB', [value.split(',')[0]])
                draft.updateProperty(rootId, 'BR', [value.split(',')[1]])
                break
              case 'PlayerW':
                draft.updateProperty(rootId, 'PW', [value.split(',')[0]])
                draft.updateProperty(rootId, 'WR', [value.split(',')[1]])
                break
              case 'Size':
                draft.updateProperty(rootId, 'SZ', [value])
                break
              case 'Hdcp':
                if (value.split(',')[0] != '0') {
                  draft.updateProperty(rootId, 'HA', [value.split(',')[0]])
                }
                draft.updateProperty(rootId, 'KM', [value.split(',')[1]])
                break
              case 'Rules':
                draft.updateProperty(rootId, 'RU', [value])
                break
              case 'Date':
                draft.updateProperty(rootId, 'DT', [
                  value.split(',')[0].replace(/\//g, '-')
                ])
                break
              case 'Copyright':
                draft.updateProperty(rootId, 'CP', [value])
                break
              case 'Winner':
                draft.updateProperty(rootId, 'RE', [
                  value.split(',')[0] + '+' + value.split(',')[1]
                ])
                break
            }
            break
          case 'Data':
            let [coords, color, nodeNum, _] = line.split(',')
            lastNodeId = draft.appendNode(lastNodeId, {
              [color[0]]: [convertVertex(coords, parseInt(draft.root.data.SZ))]
            })
            break
          case 'ReviewNode':
            break
          case 'ReviewComment':
            break
          default:
            break
        }
      }
    })
  ]
}

export function parseFile(filename) {
  let buffer = readFileSync(filename)
  let encoding = 'utf8'
  let detected = detect(buffer)
  if (detected.confidence > 0.2) encoding = detected.encoding

  let content = decode(buffer, encoding)
  return parse(content)
}
