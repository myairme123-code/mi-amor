// Mi Amor's PIN is a romantic puzzle, not secure authentication.
// GitHub Pages visitors can inspect client-side JavaScript.
const CORRECT_PIN = '0326';
let pin = '';
let unlocked = false;
const dots = [...document.querySelectorAll('.pin-dot')];
const card = document.getElementById('lockCard');
const unlockButton = document.getElementById('unlock');
const feedback = document.getElementById('feedback');
const successScreen = document.getElementById('successScreen');

function render() {
  dots.forEach((dot, i) => {
    const filled = i < pin.length;
    dot.textContent = filled ? '♥' : '·';
    dot.classList.toggle('filled', filled);
  });
  unlockButton.disabled = pin.length !== 4;
}
function addDigit(digit) {
  if (unlocked || pin.length >= 4) return;
  pin += digit;
  feedback.textContent = '';
  render();
}
function removeDigit() {
  if (unlocked) return;
  pin = pin.slice(0, -1);
  feedback.textContent = '';
  render();
}
function submitPin() {
  if (unlocked || pin.length !== 4) return;
  if (pin === CORRECT_PIN) {
    unlocked = true;
    feedback.textContent = 'Welcome, mi amor! ♡';
    setTimeout(() => { successScreen.hidden = false; }, 550);
  } else {
    feedback.textContent = 'BRUHHH, ikaw ba talaga yan? 🕵🏿';
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    pin = '';
    render();
  }
}
document.querySelectorAll('[data-digit]').forEach(button => {
  button.addEventListener('click', () => addDigit(button.dataset.digit));
});
document.getElementById('backspace').addEventListener('click', removeDigit);
unlockButton.addEventListener('click', submitPin);
document.addEventListener('keydown', event => {
  if (unlocked || event.altKey || event.ctrlKey || event.metaKey) return;
  if (/^[0-9]$/.test(event.key)) addDigit(event.key);
  else if (event.key === 'Backspace') { event.preventDefault(); removeDigit(); }
  else if (event.key === 'Enter') submitPin();
});
render();

document.getElementById("enterArena").addEventListener("click",()=>window.openMiAmorGame());
