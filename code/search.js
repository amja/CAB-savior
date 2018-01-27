window.onload = function() {

  var ele = document.getElementById('course-finder');
  ele.onsubmit = function() {
    var url = "http://10.38.58.25:8080/?course_code=" + document.getElementById('search').value;
    fetch(url)
    .then(res => res.json())
    .then((out) => {
      console.log('Checkout this JSON! ', out);
      document.getElementById("coursecode").innerHTML = out.code;
      document.getElementById("classname").innerHTML = out.title;
      document.getElementById("classsize").innerHTML = out.sections[0].capacity;
      document.getElementById("classavail").innerHTML = out.sections[0].avail;
    })
    .catch(err => { throw err });
    return false;
  }

}