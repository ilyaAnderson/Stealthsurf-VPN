const questions = document.querySelectorAll('.question-answer-container');

questions.forEach(function(currentItem) {
    currentItem.addEventListener('click', function() {
        
        const isAlreadyOpen = currentItem.classList.contains('clicked');
        
        questions.forEach(function(item) {
            item.classList.remove('clicked');
        });
        
        if (!isAlreadyOpen) {
            currentItem.classList.add('clicked');
        }
    });
});
