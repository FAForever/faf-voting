function searchPartentQuestion(questions, parentQuestionId) {
    for (i in questions) {
        if (questions[i].id === parentQuestionId) {
            return questions[i];
        }
    }
    return null;
}