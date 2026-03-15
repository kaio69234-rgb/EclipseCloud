window.addEventListener("load", () => {
document.getElementById("loader").style.display="none";
});

ScrollReveal().reveal('.hero',{
distance:'60px',
duration:1200,
origin:'bottom'
});

ScrollReveal().reveal('.plan-card',{
interval:200
});

ScrollReveal().reveal('.feature',{
interval:150
});
