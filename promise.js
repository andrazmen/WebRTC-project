const promise = new Promise((resolve, reject) => {
    let value = false;
    if(value) {
        resolve("succes");
    }
    else {
        reject("nothing");
    }
});
promise
    .then((taco) => {
        console.log(taco);
    })
    .catch((err) => {
        console.log(err);
    });




// FUNCTION
function func(){
    return "Hello";
}

hello = func();

hello = function(){
    return "Hello";
}

hello = () => {
    return "Hello";
}

// PROMISE
let myPromise = new Promise(function(myResolve, myReject) {
    // "Producing Code" (May take some time)
    
      myResolve(); // when successful
      myReject();  // when error
    });
    
    // "Consuming Code" (Must wait for a fulfilled Promise)
    myPromise.then(
      function(value) { /* code if successful */ },
      function(error) { /* code if some error */ }
    );