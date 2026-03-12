// ============================================================================
// CONFIGURAÇÕES INICIAIS DO CANVAS E MODOS DE JOGO
// ============================================================================
const canvas = document.getElementById('jogoCanvas');
const ctx = canvas.getContext('2d');
const tamanhoGrade = 32;

// ============================================================================
// 1. CARREGAMENTO DE IMAGENS (SPRITES E FUNDO)
// ============================================================================
const imgCabeca = new Image(); imgCabeca.src = 'Destroyer E(cabeça).png';
const imgCorpo = new Image(); imgCorpo.src = 'Destroyer E(corpo).png';
const imgRabo = new Image(); imgRabo.src = 'Destroyer E (rabo).png';
const imgComida = new Image(); imgComida.src = 'comida.png';
const imgFundo = new Image(); imgFundo.src = 'fundo.jpg';
const imgPowerUp = new Image(); imgPowerUp.src = 'Destroyer E (parte-fora).png';

const imgMorte = new Image(); imgMorte.src = 'orb.morte.png';
const imgTempo = new Image(); imgTempo.src = 'orb-tempo.png';
const imgPontosExtra = new Image(); imgPontosExtra.src = 'pontos-extra.png';

// ============================================================================
// 1.5 CARREGAMENTO DE ÁUDIOS (EFEITOS SONOROS E MÚSICA)
// ============================================================================
const musicaFundo = new Audio('musica.mp3');
musicaFundo.loop = true; 
musicaFundo.volume = 0.3; 

const somComer = new Audio('comer.mp3'); 
const somPowerUp = new Audio('power-up.mp3'); 
const somGameOver = new Audio('som-de-morte.mp3');
const somMorte = new Audio('som-de-morte.mp3'); 
const somTempo = new Audio('power-up.mp3'); 
const somPontos = new Audio('power-up.mp3'); 
const somVitoria = new Audio('vitoria.mp3'); 

function tocarSom(som) {
    som.currentTime = 0;
    som.play().catch(e => console.log("Áudio a aguardar interação..."));
}

function pararMusica() {
    musicaFundo.pause();
    musicaFundo.currentTime = 0;
}

// ============================================================================
// 2. VARIÁVEIS DO JOGO E ITENS ESPECIAIS
// ============================================================================
let cobra = [
    { x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }, { x: 10, y: 13 }
];
let barraMetal = { x: 0, y: 0 };

let powerUp = { x: -1, y: -1, ativo: false };
let orbMorte = { x: -1, y: -1, ativo: false, timer: null }; 
let orbTempo = { x: -1, y: -1, ativo: false };
let orbPontos = { x: -1, y: -1, ativo: false };

let invencivelTemporario = false;
let timerInvencibilidade;

let lentidaoAtiva = false;
let timerLentidao;

let pontuacao = 0;
let modoJogo = 'infinito';
let velocidadeOriginal = 150; // Agora o padrão é 150
let velocidadeAtual = 150;

let modoDeus = false;
let modoAutomatico = false;

let dx = 0;
let dy = 0;
let cicloJogo;

// ============================================================================
// 3. CONTROLOS DO JOGADOR (TECLADO)
// ============================================================================
document.addEventListener('keydown', (evento) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(evento.code) > -1) {
        evento.preventDefault();
    }

    if (!modoAutomatico) {
        if (evento.key === 'ArrowUp' && dy !== 1) { dx = 0; dy = -1; }
        if (evento.key === 'ArrowDown' && dy !== -1) { dx = 0; dy = 1; }
        if (evento.key === 'ArrowLeft' && dx !== 1) { dx = -1; dy = 0; }
        if (evento.key === 'ArrowRight' && dx !== -1) { dx = 1; dy = 0; }
    }

    if (evento.key.toLowerCase() === 'g') modoDeus = !modoDeus;
    if (evento.key.toLowerCase() === 'k') modoAutomatico = !modoAutomatico;
});

// ============================================================================
// 4. FUNÇÕES DE LÓGICA E INTELIGÊNCIA ARTIFICIAL
// ============================================================================
function sortearComida() {
    let posicaoValida = false;
    while (!posicaoValida) {
        barraMetal.x = Math.floor(Math.random() * (canvas.width / tamanhoGrade));
        barraMetal.y = Math.floor(Math.random() * (canvas.height / tamanhoGrade));
        posicaoValida = true;

        for (let i = 0; i < cobra.length; i++) {
            if (barraMetal.x === cobra[i].x && barraMetal.y === cobra[i].y) { posicaoValida = false; break; }
        }
    }
}

function sortearItem(itemObj) {
    let posicaoValida = false;
    while (!posicaoValida) {
        itemObj.x = Math.floor(Math.random() * (canvas.width / tamanhoGrade));
        itemObj.y = Math.floor(Math.random() * (canvas.height / tamanhoGrade));
        posicaoValida = true;

        for (let i = 0; i < cobra.length; i++) {
            if (itemObj.x === cobra[i].x && itemObj.y === cobra[i].y) { posicaoValida = false; break; }
        }
        if (itemObj.x === barraMetal.x && itemObj.y === barraMetal.y) posicaoValida = false;
    }
    itemObj.ativo = true;
}

function sortearOrbMorte() {
    sortearItem(orbMorte);
    if (orbMorte.timer) clearTimeout(orbMorte.timer);
    orbMorte.timer = setTimeout(() => {
        orbMorte.ativo = false; 
    }, 5000);
}

function jogarAutomatico() {
    if (!modoAutomatico) return;

    let imortal = modoDeus || invencivelTemporario;
    let cabeca = cobra[0];
    let direcoesPossiveis = [
        { nx: 0, ny: -1 }, { nx: 0, ny: 1 }, { nx: -1, ny: 0 }, { nx: 1, ny: 0 }
    ];
    let direcoesSeguras = [];

    function posicaoPerigosa(x, y) {
        if (x < 0 || x >= canvas.width / tamanhoGrade || y < 0 || y >= canvas.height / tamanhoGrade) {
            if (!imortal) return true;
        }
        for (let i = 0; i < cobra.length - 1; i++) {
            if (x === cobra[i].x && y === cobra[i].y) {
                if (!imortal) return true;
            }
        }
        if (orbMorte.ativo && x === orbMorte.x && y === orbMorte.y) {
            if (!imortal) return true;
        }
        return false;
    }

    for (let d of direcoesPossiveis) {
        if (d.nx === -dx && d.ny === -dy && (dx !== 0 || dy !== 0)) continue;

        let proxX = cabeca.x + d.nx;
        let proxY = cabeca.y + d.ny;

        if (!posicaoPerigosa(proxX, proxY)) {
            let saidasNoFuturo = 0;
            for (let dFuturo of direcoesPossiveis) {
                if (dFuturo.nx === -d.nx && dFuturo.ny === -d.ny) continue;
                let futuroX = proxX + dFuturo.nx;
                let futuroY = proxY + dFuturo.ny;
                if (!posicaoPerigosa(futuroX, futuroY)) { saidasNoFuturo++; }
            }

            let distancia = Math.abs(proxX - barraMetal.x) + Math.abs(proxY - barraMetal.y);
            direcoesSeguras.push({ dx: d.nx, dy: d.ny, dist: distancia, saidas: saidasNoFuturo });
        }
    }

    if (direcoesSeguras.length > 0) {
        let direcoesComFuga = direcoesSeguras.filter(d => d.saidas > 0);
        let listaFinal = direcoesComFuga.length > 0 ? direcoesComFuga : direcoesSeguras;
        listaFinal.sort((a, b) => a.dist - b.dist);
        dx = listaFinal[0].dx; dy = listaFinal[0].dy;
    }
}

// ============================================================================
// 5. MOTOR DO JOGO (ATUALIZAÇÃO E ITENS ESPECIAIS)
// ============================================================================
function atualizarJogo() {
    jogarAutomatico();

    if (dx === 0 && dy === 0 && !modoAutomatico) {
        desenharJogo(); return;
    }

    let novaCabeca = { x: cobra[0].x + dx, y: cobra[0].y + dy };
    let imortal = modoDeus || invencivelTemporario;

    // Colisão: Parede
    if (novaCabeca.x < 0 || novaCabeca.x >= canvas.width / tamanhoGrade ||
        novaCabeca.y < 0 || novaCabeca.y >= canvas.height / tamanhoGrade) {
        if (imortal) {
            if (novaCabeca.x < 0) novaCabeca.x = (canvas.width / tamanhoGrade) - 1;
            if (novaCabeca.x >= canvas.width / tamanhoGrade) novaCabeca.x = 0;
            if (novaCabeca.y < 0) novaCabeca.y = (canvas.height / tamanhoGrade) - 1;
            if (novaCabeca.y >= canvas.height / tamanhoGrade) novaCabeca.y = 0;
        } else {
            pararMusica();
            tocarSom(somGameOver);
            alert("Bateu na parede! Game Over.\nPontuação Final: " + pontuacao);
            location.reload(); return;
        }
    }

    // Colisão: Corpo
    for (let i = 0; i < cobra.length; i++) {
        if (novaCabeca.x === cobra[i].x && novaCabeca.y === cobra[i].y) {
            if (!imortal) {
                pararMusica();
                tocarSom(somGameOver);
                alert("Colidiu com o próprio corpo! Game Over.\nPontuação Final: " + pontuacao);
                location.reload(); return;
            }
        }
    }

    cobra.unshift(novaCabeca);

    // ==============================================
    // INTERAÇÃO COM OS ITENS DO MAPA
    // ==============================================

    // 1. COMER A COMIDA NORMAL
    if (novaCabeca.x === barraMetal.x && novaCabeca.y === barraMetal.y) {
        tocarSom(somComer); 
        sortearComida();
        pontuacao += 10;

        if (pontuacao > 0 && pontuacao % 100 === 0) sortearItem(powerUp);
        if (Math.random() < 0.20 && !orbMorte.ativo) sortearOrbMorte(); 
        if (Math.random() < 0.15 && !orbTempo.ativo) sortearItem(orbTempo);
        if (Math.random() < 0.10 && !orbPontos.ativo) sortearItem(orbPontos);

        if (modoJogo === '1000' && pontuacao >= 1000) {
            pararMusica();
            tocarSom(somVitoria); 
            alert("🏆 PARABÉNS! Atingiu 1000 pontos e completou a missão!");
            location.reload(); return;
        }
    } else {
        if (!(orbPontos.ativo && novaCabeca.x === orbPontos.x && novaCabeca.y === orbPontos.y)) {
            cobra.pop();
        }
    }

    // 2. PEGAR INVENCIBILIDADE (Parte-Fora)
    if (powerUp.ativo && novaCabeca.x === powerUp.x && novaCabeca.y === powerUp.y) {
        tocarSom(somPowerUp); 
        powerUp.ativo = false; 
        invencivelTemporario = true;
        if (timerInvencibilidade) clearTimeout(timerInvencibilidade);
        timerInvencibilidade = setTimeout(() => { invencivelTemporario = false; }, 5000);
    }

    // 3. PEGAR ORBE DA MORTE
    if (orbMorte.ativo && novaCabeca.x === orbMorte.x && novaCabeca.y === orbMorte.y) {
        orbMorte.ativo = false; 
        if (!imortal) {
            pararMusica();
            tocarSom(somGameOver); 
            alert("Tocou na Orbe da Morte! Sistema Crítico. Game Over.\nPontuação Final: " + pontuacao);
            location.reload(); return;
        }
    }

    // 4. PEGAR ORBE DO TEMPO
    if (orbTempo.ativo && novaCabeca.x === orbTempo.x && novaCabeca.y === orbTempo.y) {
        tocarSom(somPowerUp); 
        orbTempo.ativo = false; 
        lentidaoAtiva = true;

        clearInterval(cicloJogo);
        // Quando pega o orbe do tempo, ele fica ainda mais lento (adiciona 150ms à velocidade atual)
        velocidadeAtual = velocidadeOriginal + 150;
        cicloJogo = setInterval(atualizarJogo, velocidadeAtual);

        if (timerLentidao) clearTimeout(timerLentidao);
        timerLentidao = setTimeout(() => {
            lentidaoAtiva = false;
            clearInterval(cicloJogo);
            velocidadeAtual = velocidadeOriginal;
            cicloJogo = setInterval(atualizarJogo, velocidadeAtual);
        }, 10000);
    }

    // 5. PEGAR PONTOS EXTRA E +5 PARTES
    if (orbPontos.ativo && novaCabeca.x === orbPontos.x && novaCabeca.y === orbPontos.y) {
        tocarSom(somPowerUp); 
        orbPontos.ativo = false; 
        pontuacao += 50;

        let caudaAtual = cobra[cobra.length - 1];
        for (let p = 0; p < 4; p++) {
            cobra.push({ x: caudaAtual.x, y: caudaAtual.y });
        }

        if (modoJogo === '1000' && pontuacao >= 1000) {
            pararMusica();
            tocarSom(somVitoria); 
            alert("🏆 PARABÉNS! Atingiu 1000 pontos e completou a missão!");
            location.reload(); return;
        }
    }

    desenharJogo();
}

// ============================================================================
// 6. DESENHAR NO ECRÃ
// ============================================================================
function desenharJogo() {
    ctx.drawImage(imgFundo, 0, 0, canvas.width, canvas.height);

    ctx.drawImage(imgComida, barraMetal.x * tamanhoGrade, barraMetal.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (powerUp.ativo) ctx.drawImage(imgPowerUp, powerUp.x * tamanhoGrade, powerUp.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (orbMorte.ativo) ctx.drawImage(imgMorte, orbMorte.x * tamanhoGrade, orbMorte.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (orbTempo.ativo) ctx.drawImage(imgTempo, orbTempo.x * tamanhoGrade, orbTempo.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (orbPontos.ativo) ctx.drawImage(imgPontosExtra, orbPontos.x * tamanhoGrade, orbPontos.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);

    for (let i = 0; i < cobra.length; i++) {
        let pedaco = cobra[i];
        let imagemAtual; let angulo = 0;

        if (i === 0) imagemAtual = imgCabeca;
        else if (i === cobra.length - 1) imagemAtual = imgRabo;
        else imagemAtual = imgCorpo;

        if (i === 0) {
            if (dx === 1) angulo = Math.PI / 2;
            else if (dx === -1) angulo = -Math.PI / 2;
            else if (dy === 1) angulo = Math.PI;
            else if (dy === -1) angulo = 0;
        } else {
            let pedacoDaFrente = cobra[i - 1];
            let diferencaX = pedacoDaFrente.x - pedaco.x;
            let diferencaY = pedacoDaFrente.y - pedaco.y;

            if (diferencaX === 1) angulo = Math.PI / 2;
            else if (diferencaX === -1) angulo = -Math.PI / 2;
            else if (diferencaY === 1) angulo = Math.PI;
            else if (diferencaY === -1) angulo = 0;
        }

        ctx.save();
        ctx.translate(pedaco.x * tamanhoGrade + tamanhoGrade / 2, pedaco.y * tamanhoGrade + tamanhoGrade / 2);
        ctx.rotate(angulo);
        ctx.drawImage(imagemAtual, -tamanhoGrade / 2, -tamanhoGrade / 2, tamanhoGrade, tamanhoGrade);
        ctx.restore();
    }

    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.shadowColor = "black"; ctx.shadowBlur = 4;

    let textoModo = modoJogo === '1000' ? "Meta: 1000" : "Infinito";
    ctx.fillText("Pontos: " + pontuacao + " (" + textoModo + ")", 20, 40);

    let linhaTextoY = 70;

    if (invencivelTemporario) {
        ctx.fillStyle = "#ff00ff";
        ctx.fillText("★ INVENCÍVEL ★", 20, linhaTextoY);
        linhaTextoY += 30;
    } else if (modoDeus) {
        ctx.fillStyle = "yellow";
        ctx.fillText("MODO DEUS (G)", 20, linhaTextoY);
        linhaTextoY += 30;
    }

    if (lentidaoAtiva) {
        ctx.fillStyle = "#00ffff";
        ctx.fillText("❄️ TEMPO LENTO (10s) ❄️", 20, linhaTextoY);
        linhaTextoY += 30;
    }

    if (modoAutomatico) {
        ctx.fillStyle = "cyan";
        ctx.fillText("BOT (K)", 20, linhaTextoY);
    }
    ctx.shadowBlur = 0;
}

// ============================================================================
// 7. INICIALIZAÇÃO E MENUS
// ============================================================================
let imagensCarregadas = 0;
const totalImagens = 9;

function iniciar() {
    imagensCarregadas++;
    if (imagensCarregadas === totalImagens) {

        let escolhaModo = prompt("ESCOLHA O MODO DE JOGO:\n\n1 - Modo Infinito\n2 - Chegar a 1000 Pontos\n\n(Escreve 1 ou 2 e clica em OK)", "1");
        if (escolhaModo === '2') modoJogo = '1000';
        else modoJogo = 'infinito';

        let escolhaVelocidade = prompt("ESCOLHA A VELOCIDADE:\n\n1 - Lento\n2 - Normal\n3 - Muito Rápido\n\n(Escreve 1, 2 ou 3 e clica em OK)", "2");
        
        // --- NOVAS VELOCIDADES AQUI ---
        if (escolhaVelocidade === '1') velocidadeOriginal = 300; // Ficou mais lento
        else if (escolhaVelocidade === '3') velocidadeOriginal = 80;  // Ficou um pouco mais lento
        else velocidadeOriginal = 150; // O normal agora é 150 (mais confortável)

        velocidadeAtual = velocidadeOriginal;
        sortearComida();
        
        musicaFundo.play().catch(e => console.log("A aguardar interação para iniciar áudio..."));
        
        cicloJogo = setInterval(atualizarJogo, velocidadeAtual);
    }
}
function erroAoCarregar() { console.error("ERRO: Verifica os nomes das imagens na pasta."); }

imgCabeca.onload = iniciar; imgCabeca.onerror = erroAoCarregar;
imgCorpo.onload = iniciar; imgCorpo.onerror = erroAoCarregar;
imgRabo.onload = iniciar; imgRabo.onerror = erroAoCarregar;
imgComida.onload = iniciar; imgComida.onerror = erroAoCarregar;
imgFundo.onload = iniciar; imgFundo.onerror = erroAoCarregar;
imgPowerUp.onload = iniciar; imgPowerUp.onerror = erroAoCarregar;
imgMorte.onload = iniciar; imgMorte.onerror = erroAoCarregar;
imgTempo.onload = iniciar; imgTempo.onerror = erroAoCarregar;
imgPontosExtra.onload = iniciar; imgPontosExtra.onerror = erroAoCarregar;