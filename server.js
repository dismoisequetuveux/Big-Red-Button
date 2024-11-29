const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Configurer Cloudinary
cloudinary.config({
    cloud_name: 'dxtkaqupj',
    api_key: '429192248384185',
    api_secret: '5GZGqTXiKwXV6_0Wt1nMbsvaIMk'
});

// Middleware pour gérer les fichiers en mémoire avec Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route pour récupérer les fichiers audio depuis Cloudinary avec pagination
app.get('/audio-files', async (req, res) => {
    try {
        let allResources = [];
        let nextCursor = null;

        do {
            // Récupérer les fichiers depuis Cloudinary
            const response = await cloudinary.api.resources({
                type: 'upload',
                resource_type: 'video', // Gestion des fichiers vidéo/audio
                prefix: 'audio/', // Cherche dans le dossier "audio"
                max_results: 100, // Limite de 100 fichiers par requête
                next_cursor: nextCursor // Récupérer la page suivante si elle existe
            });

            allResources = [...allResources, ...response.resources];
            nextCursor = response.next_cursor; // Page suivante
        } while (nextCursor);

        const audioFiles = allResources.map(file => ({
            url: file.secure_url,
            name: path.basename(file.public_id) // Conserve le nom de fichier avec extension
        }));

        res.json(audioFiles); // Retourne la liste complète des fichiers audio
    } catch (err) {
        console.error('Erreur lors de la récupération des fichiers Cloudinary:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des fichiers audio.' });
    }
});

// Route pour uploader un fichier sur Cloudinary
app.post('/upload', upload.single('audioFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni.' });
    }

    // Vérification des formats acceptés
    const allowedFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedFormats.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Format de fichier non supporté. Utilisez MP3, WAV ou OGG.' });
    }

    const originalFilename = path.parse(req.file.originalname).name;

    const uploadStream = cloudinary.uploader.upload_stream(
        {
            resource_type: 'video', // Fichiers audio traités comme des vidéos
            folder: 'audio',
            use_filename: true, // Utilise le nom d'origine
            unique_filename: false, // Pas de noms aléatoires
            public_id: originalFilename // Nom explicite basé sur le fichier original
        },
        (error, result) => {
            if (error) {
                console.error('Erreur lors de l\'upload sur Cloudinary:', error);
                return res.status(500).json({ error: 'Erreur lors de l\'upload.' });
            }
            res.status(200).json({ success: true, url: result.secure_url });
        }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

// Socket.IO pour diffuser les sons
io.on('connection', (socket) => {
    console.log(`Utilisateur connecté : ${socket.id}`);

    socket.on('play-audio', (audioSrc) => {
        console.log(`Diffusion audio : ${audioSrc}`);
        io.emit('play-audio', audioSrc);
    });

    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté : ${socket.id}`);
    });
});

// Démarrer le serveur avec un port dynamique
server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
