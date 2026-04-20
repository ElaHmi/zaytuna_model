document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const verifyBtn = document.getElementById('verifyBtn');
    
    const resultsCard = document.getElementById('resultsCard');
    const resultBanner = document.getElementById('resultBanner');
    const resultStatus = document.getElementById('resultStatus');
    const aiScore = document.getElementById('aiScore');
    const thresholdValue = document.getElementById('thresholdValue');
    const bestMatch = document.getElementById('bestMatch');
    const rawResultsList = document.getElementById('rawResultsList');

    // Handle Tag Chips
    document.querySelectorAll('.tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.getElementById('themeTag').value = chip.textContent;
        });
    });

    let selectedFile = null;

    // Handle Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Handle File Input selection
    imageInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            selectedFile = files[0];
            
            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                previewContainer.classList.remove('hidden');
                dropZone.classList.add('hidden');
                verifyBtn.disabled = false;
            }
            reader.readAsDataURL(selectedFile);
        }
    }

    // Handle Verification
    verifyBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        const age = document.getElementById('age').value;
        const themeTag = document.getElementById('themeTag').value;

        if (!themeTag) {
            alert('Please enter a theme tag');
            return;
        }

        // Setup UI for processing
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Processing...';
        resultsCard.classList.remove('hidden');
        resultBanner.className = 'result-banner';
        resultStatus.textContent = 'Analyzing Image...';
        aiScore.textContent = '-';
        rawResultsList.innerHTML = '';

        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('age', age);
        formData.append('theme', themeTag);

        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Server error');
            }

            // Update UI with results
            if (data.isVerified) {
                resultBanner.className = 'result-banner success';
                resultStatus.textContent = `Match Verified! (Age ${data.ageUsed})`;
            } else {
                resultBanner.className = 'result-banner fail';
                resultStatus.textContent = `Match Failed (Age ${data.ageUsed})`;
            }

            aiScore.textContent = data.aiMatchScore.toFixed(3);
            thresholdValue.textContent = data.thresholdRequired.toFixed(3);
            bestMatch.textContent = data.bestMatchLabel;

            // Render raw probabilities for debug
            data.rawResults.forEach(res => {
                const li = document.createElement('li');
                
                const labelSpan = document.createElement('span');
                labelSpan.textContent = res.label;
                
                const scoreSpan = document.createElement('span');
                scoreSpan.textContent = res.score.toFixed(4);
                
                // Highlight if it's the target theme
                if (res.label.includes(data.themeTag)) {
                    li.style.color = '#10B981';
                }

                li.appendChild(labelSpan);
                li.appendChild(scoreSpan);
                rawResultsList.appendChild(li);
            });

        } catch (error) {
            console.error('Error:', error);
            resultBanner.className = 'result-banner fail';
            resultStatus.textContent = 'Error: ' + error.message;
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify Match';
        }
    });

    // Reset UI if image is clicked
    imagePreview.addEventListener('click', () => {
        selectedFile = null;
        imagePreview.src = '';
        previewContainer.classList.add('hidden');
        dropZone.classList.remove('hidden');
        verifyBtn.disabled = true;
        resultsCard.classList.add('hidden');
        imageInput.value = ''; // clear input
    });
});
