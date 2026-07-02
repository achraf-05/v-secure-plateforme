import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3001

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

const BROADCAST_EVENTS = ['annotation_created', 'annotation_updated', 'comment_added', 'annotations_cleared']

io.on('connection', (socket) => {
  console.log(`[+] Client connecté : ${socket.id}  (total : ${io.engine.clientsCount})`)

  BROADCAST_EVENTS.forEach((event) => {
    socket.on(event, (data) => {
      socket.broadcast.emit(event, data)
    })
  })

  socket.on('disconnect', (reason) => {
    console.log(`[-] Client déconnecté : ${socket.id}  (raison : ${reason})`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`WebSocket server écoute sur ws://localhost:${PORT}`)
})
