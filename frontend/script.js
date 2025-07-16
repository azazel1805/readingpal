// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const difficultySelect = document.getElementById('difficulty');
    const getPassageBtn = document.getElementById('get-passage-btn');
    const passageContainer = document.getElementById('passage-container');
    const passageTextElem = document.getElementById('passage-text');
    const recordBtn = document.getElementById('record-btn');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContentElem = document.getElementById('feedback-content');
    const loadingElem = document.getElementById('loading');
    const loadingTextElem = document.getElementById('loading-text');

    // IMPORTANT: Replace with your deployed backend URL in production
    const BACKEND_URL = 'http://localhost:3000'; 

    let recognition;
    let isRecording = false;
    let finalTranscript = '';

    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            finalTranscript += transcript;
        };

        recognition.onend = () => {
            isRecording = false;
            recordBtn.textContent = 'Start Recording';
            recordBtn.classList.remove('recording');
            recordBtn.disabled = true; // Disable until analysis is done
            analyzeReading();
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            alert(`Speech recognition error: ${event.error}. Please check your microphone permissions.`);
            setLoading(false);
        };

    } else {
        alert("Your browser does not support the Web Speech API. Please try Chrome or Edge.");
        getPassageBtn.disabled = true;
        recordBtn.disabled = true;
    }

    getPassageBtn.addEventListener('click', fetchPassage);
    recordBtn.addEventListener('click', toggleRecording);

    function setLoading(isLoading, text = '') {
        if (isLoading) {
            loadingTextElem.textContent = text;
            loadingElem.classList.remove('hidden');
        } else {
            loadingElem.classList.add('hidden');
        }
    }

    async function fetchPassage() {
        setLoading(true, 'Generating a new passage...');
        passageContainer.classList.add('hidden');
        feedbackContainer.classList.add('hidden');

        try {
            const response = await fetch(`${BACKEND_URL}/generate-passage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty: difficultySelect.value }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            passageTextElem.textContent = data.passage;
            passageContainer.classList.remove('hidden');
            recordBtn.disabled = false;

        } catch (error) {
            console.error("Error fetching passage:", error);
            alert("Failed to fetch a new passage. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function toggleRecording() {
        if (!recognition) return;

        isRecording = !isRecording;
        if (isRecording) {
            finalTranscript = '';
            feedbackContainer.classList.add('hidden');
            recordBtn.textContent = 'Stop Recording';
            recordBtn.classList.add('recording');
            recognition.start();
        } else {
            recordBtn.textContent = 'Processing...';
            recordBtn.disabled = true;
            recognition.stop();
        }
    }

    async function analyzeReading() {
        setLoading(true, 'Analyzing your speech...');
        const originalPassage = passageTextElem.textContent;

        try {
            const response = await fetch(`${BACKEND_URL}/analyze-reading`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalPassage, userTranscript: finalTranscript }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const feedback = await response.json();
            displayFeedback(feedback);

        } catch (error) {
            console.error("Error analyzing reading:", error);
            alert("Failed to analyze your reading. Please try again.");
        } finally {
            setLoading(false);
            recordBtn.disabled = false; // Re-enable for another try
        }
    }

    function displayFeedback(feedback) {
        feedbackContentElem.innerHTML = ''; // Clear previous feedback

        const overallP = document.createElement('p');
        overallP.innerHTML = `<strong>Overall:</strong> ${feedback.overallFeedback}`;
        feedbackContentElem.appendChild(overallP);

        if (feedback.mistakes && feedback.mistakes.length > 0) {
            const list = document.createElement('ul');
            feedback.mistakes.forEach(mistake => {
                const item = document.createElement('li');
                let mistakeHtml = '';

                switch (mistake.type) {
                    case 'mispronunciation':
                        mistakeHtml = `You said "<em>${mistake.userWord}</em>" instead of "<span class="mistake-word" data-word="${mistake.originalWord}">${mistake.originalWord}</span>".`;
                        break;
                    case 'omission':
                        mistakeHtml = `You missed the word "<span class="mistake-word" data-word="${mistake.originalWord}">${mistake.originalWord}</span>".`;
                        break;
                    case 'insertion':
                        mistakeHtml = `You added the extra word "<em>${mistake.userWord}</em>".`;
                        break;
                    default:
                        mistakeHtml = 'An unknown error occurred.';
                }
                item.innerHTML = `${mistakeHtml}<br><small><strong>Context:</strong> ...${mistake.context}...</small>`;
                list.appendChild(item);
            });
            feedbackContentElem.appendChild(list);
        } else {
            const perfectP = document.createElement('p');
            perfectP.textContent = '🎉 No mistakes detected. Fantastic job!';
            feedbackContentElem.appendChild(perfectP);
        }

        feedbackContainer.classList.remove('hidden');
        addSpeakerEventListeners();
    }

    function addSpeakerEventListeners() {
        document.querySelectorAll('.mistake-word').forEach(span => {
            span.addEventListener('click', () => {
                const wordToSpeak = span.getAttribute('data-word');
                speakWord(wordToSpeak);
            });
        });
    }

    function speakWord(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Your browser does not support Text-to-Speech.");
        }
    }
});