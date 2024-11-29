document.addEventListener("DOMContentLoaded", () => {
    console.log("Application Big Red Button chargée.");

    const dragDropArea = document.getElementById("drag-drop-area");
    const audioSelect = document.getElementById("audio-select");
    const testAudioButton = document.getElementById("test-audio");
    const playAudioButton = document.getElementById("play-audio");
    const volumeControl = document.getElementById("volume-control");
    const socket = io(); // Connexion au serveur Socket.IO

    let currentAudio = null;

    // Charger les fichiers audio depuis le serveur
    function loadAudioFiles() {
        fetch('/audio-files')
            .then(response => response.json())
            .then(files => {
                console.log("Fichiers audio chargés :", files);
                audioSelect.innerHTML = '<option value="" selected disabled>Choose a sound</option>';
                files.forEach(file => {
                    const option = document.createElement("option");
                    option.value = file.url;
                    option.textContent = file.name;
                    audioSelect.appendChild(option);
                });
            })
            .catch(error => console.error("Erreur lors du chargement des fichiers audio :", error));
    }

    loadAudioFiles();

    // Fonction pour jouer un son localement
    function playLocalAudio(audioSrc) {
        if (currentAudio) {
            currentAudio.pause();
        }
        currentAudio = new Audio(audioSrc);
        currentAudio.volume = volumeControl.value;
        currentAudio.play()
            .then(() => console.log(`Lecture locale : ${audioSrc}`))
            .catch(error => console.error("Erreur de lecture :", error));
    }

    // Tester un son
    testAudioButton.addEventListener("click", () => {
        const selectedAudio = audioSelect.value;
        if (selectedAudio) {
            playLocalAudio(selectedAudio);
        } else {
            alert("Veuillez sélectionner un son à tester.");
        }
    });

    // Diffuser un son
    playAudioButton.addEventListener("click", () => {
        const selectedAudio = audioSelect.value;
        if (selectedAudio) {
            console.log("Diffusion du son :", selectedAudio);
            socket.emit('play-audio', selectedAudio);
        } else {
            alert("Veuillez sélectionner un son pour le diffuser.");
        }
    });

    // Ajuster le volume
    volumeControl.addEventListener("input", () => {
        if (currentAudio) {
            currentAudio.volume = volumeControl.value;
        }
    });

    // Drag and drop pour uploader un fichier
    dragDropArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        dragDropArea.style.borderColor = "green";
    });

    dragDropArea.addEventListener("dragleave", () => {
        dragDropArea.style.borderColor = "white";
    });

    dragDropArea.addEventListener("drop", (event) => {
        event.preventDefault();
        dragDropArea.style.borderColor = "white";

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const audioFile = files[0];

            const allowedFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
            if (!allowedFormats.includes(audioFile.type)) {
                alert("Format de fichier non supporté. Veuillez utiliser MP3, WAV ou OGG.");
                return;
            }

            const formData = new FormData();
            formData.append("audioFile", audioFile);

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`Fichier "${audioFile.name}" téléchargé avec succès.`);
                        loadAudioFiles(); // Recharge la liste des fichiers audio
                    } else {
                        alert("Échec du téléchargement du fichier.");
                    }
                })
                .catch(error => console.error("Erreur lors de l'upload :", error));
        }
    });

    // Jouer le son diffusé via Socket.IO
    socket.on('play-audio', (audioSrc) => {
        console.log("Son reçu pour diffusion :", audioSrc);
        playLocalAudio(audioSrc);
    });
});
