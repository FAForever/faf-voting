function sortOrShuffle(choices) {
    let hasOrdinals = false;
    for (choice in choices) {
        if (choices[choice].ordinal > 0) {
            hasOrdinals = true;
        }
    }
    return hasOrdinals ? sort(choices) : shuffle(choices);
}

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to sortOrShuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function sort(choices) {
    return choices.sort(function (a, b) {
        return a.ordinal - b.ordinal;
    });
}
