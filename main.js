import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import { serve } from '@hono/node-server'

const app = new Hono()

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({
  app
})

/**
 * @type {Map<string, Map<string, import('hono/ws').WSContext>>}
 */
const connections = new Map()

app.get('/', c => c.text('hello world'))

app.get('/:room', upgradeWebSocket(async (c) => {
  const room = c.req.param('room')

  /**
   * @type {Map<string, import('hono/ws').WSContext>}
   */
  let roomConnections = connections.get(room)
  if (!roomConnections) {
    roomConnections = new Map()
    connections.set(room, roomConnections)
  }

  const connId = crypto.randomUUID()

  return {
    onOpen(_evt, ws) {
      roomConnections.set(connId, ws)
    },
    onMessage(evt) {
      for (const ws of roomConnections.values()) {
        ws.send(evt.data)
      }
    },
    onClose() {
      roomConnections.delete(connId)
    }
  }
}))

const server = serve({
  fetch: app.fetch,
  port: parseInt(process.env.PORT ?? 3030)
})
injectWebSocket(server)
