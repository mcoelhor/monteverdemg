// Trilhas de Monte Verde. Textos próprios, com base em guias e relatos públicos (nov/2026).
// Coordenadas: Google Maps. "wikiloc": cole aqui o endereço do "Embed Map" (iframe src) de uma trilha
// do Wikiloc, quando escolher uma; o mapa dela aparece na página com o crédito do autor.
// Condições mudam: o site sempre pede para confirmar com a MOVE antes de ir.

const ESTACIONAMENTO = { nome: 'Estacionamento das trilhas (Av. das Montanhas, 3647)', lat: -22.88228, lng: -46.02400 }

export const TRILHAS = [
  {
    slug: 'pedra-redonda',
    nome: 'Pedra Redonda',
    resumo: 'A trilha mais famosa da vila: curta, estruturada e com vista de Minas e São Paulo ao mesmo tempo.',
    nivel: 'Fácil a moderado', distancia: 'cerca de 1 km (ida)', tempo: '1h30 ida e volta', altitude: '1.990 m',
    paga: true,
    texto: [
      'É a caminhada mais procurada de Monte Verde. O caminho tem escadas, pontes e contenções, e um mirante de madeira no meio da subida, bom para recuperar o fôlego.',
      'Lá em cima a pedra é plana como um terraço. Dá para ver as montanhas do sul de Minas, os vales de São Paulo e, em dia limpo, a região de Campos do Jordão.',
      'Como as outras trilhas da serra, o acesso é controlado pela MOVE (Agência de Desenvolvimento de Monte Verde), com ingresso pago e agendado antes de ir.',
    ],
    dicas: ['Compre o ingresso antes', 'O pôr do sol é o melhor horário: leve lanterna para a volta', 'Tem escadas: não é indicada para quem tem dificuldade de locomoção'],
    inicio: ESTACIONAMENTO, cume: { nome: 'Pedra Redonda', lat: -22.88861, lng: -46.01942 },
    wikiloc: '',
  },
  {
    slug: 'chapeu-do-bispo',
    nome: 'Chapéu do Bispo',
    resumo: 'Caminhada curta até a pedra que lembra um chapéu de bispo, saindo do mesmo estacionamento.',
    nivel: 'Fácil', distancia: 'cerca de 700 m (ida)', tempo: '1h ida e volta', altitude: '1.950 m',
    paga: false,
    texto: [
      'Sai do mesmo estacionamento da Pedra Redonda, seguindo a placa para a direita. A vista lembra a da Pedra Redonda.',
      'O nome vem da pedra no fim do caminho. Chegar até ela é fácil; subir no topo é outra história: exige força e jeito para escalar, com ajuda de uma barra de ferro.',
    ],
    dicas: ['Só suba na pedra se tiver experiência', 'Dá para emendar com o Platô'],
    inicio: ESTACIONAMENTO, cume: null,
    wikiloc: '',
  },
  {
    slug: 'plato',
    nome: 'Platô',
    resumo: 'Uma grande rocha plana logo depois do Chapéu do Bispo, com vista até o Vale do Paraíba.',
    nivel: 'Fácil', distancia: 'curta, depois do Chapéu do Bispo', tempo: '1h a 1h30 ida e volta', altitude: 'cerca de 1.900 m',
    paga: false,
    texto: [
      'Seguindo um pouco além do Chapéu do Bispo, por um caminho fácil, chega-se ao Platô: uma rocha plana e ampla, ótima para sentar e ficar.',
      'De lá dá para ver a região toda e, em dia aberto, a cidade de São José dos Campos. Quem quer uma rota mais aventureira pode subir por uma trilha que começa no fim da Rua da Mantiqueira.',
    ],
    dicas: ['Bom para ir com crianças', 'Leve agasalho: venta muito no alto'],
    inicio: ESTACIONAMENTO, cume: null,
    wikiloc: '',
  },
  {
    slug: 'pedra-partida',
    nome: 'Pedra Partida',
    resumo: 'Mais longa e cansativa que a Pedra Redonda, com um dos pontos mais altos da serra.',
    nivel: 'Moderado', distancia: 'cerca de 1,6 km ida e volta', tempo: 'cerca de 3h', altitude: 'cerca de 2.050 m',
    paga: false,
    texto: [
      'O desvio para a Pedra Partida fica no meio da trilha da Pedra Redonda e é sinalizado. O caminho é mais puxado que o da Redonda.',
      'É um dos pontos mais altos de Monte Verde, e o horizonte compensa o esforço.',
      'Em alguns períodos a trilha já ficou fechada. Confirme com a MOVE se está aberta antes de ir.',
    ],
    dicas: ['Confirme se está aberta', 'Vá cedo e com água', 'Calçado com boa aderência'],
    inicio: ESTACIONAMENTO, cume: { nome: 'Pedra Partida', lat: -22.88628, lng: -46.01371 },
    wikiloc: '',
  },
  {
    slug: 'pico-do-selado',
    nome: 'Pico do Selado',
    resumo: 'O ponto mais alto da região, com vista de 360°. Para quem tem preparo e tempo.',
    nivel: 'Moderado', distancia: 'cerca de 5 km ida e volta a partir do Platô', tempo: '3h a 4h', altitude: '2.082 m',
    paga: false,
    texto: [
      'Quem já fez costuma dizer que é a trilha mais bonita de Monte Verde. O caminho começa na parte baixa do Platô e segue boa parte dentro da mata, com mirantes no meio do trajeto.',
      'O cume, a 2.082 metros, é o ponto mais alto da região, com vista de 360° que chega ao Vale do Paraíba.',
      'A entrada não tem placa e a volta fica escorregadia com chuva. Em alguns períodos a trilha já ficou fechada: confirme antes e, se não conhece o caminho, vá com guia.',
    ],
    dicas: ['Vá com guia se for a primeira vez', 'Bastão de caminhada ajuda na descida', 'Saia cedo: escurece rápido na mata'],
    inicio: ESTACIONAMENTO, cume: { nome: 'Pico do Selado', lat: -22.89629, lng: -46.05125 },
    wikiloc: '',
  },
  {
    slug: 'pinheiro-velho',
    nome: 'Pinheiro Velho',
    resumo: 'Passeio curto dentro da vila até uma araucária de cerca de 500 anos.',
    nivel: 'Muito fácil', distancia: 'curta', tempo: '30 a 40 min', altitude: '—',
    paga: false,
    texto: [
      'Uma caminhada leve pela mata, perto do centro, que termina no Pinheiro Velho: uma araucária com cerca de 500 anos e quase 1,70 m de diâmetro.',
      'Boa para fazer com crianças ou num fim de tarde, sem precisar de carro 4x4 nem preparo.',
    ],
    dicas: ['Ótima para crianças', 'Pergunte à MOVE sobre o acesso'],
    inicio: { nome: 'Entrada da trilha', lat: -22.86162, lng: -46.03676 }, cume: null,
    wikiloc: '',
  },
]

export const trilha = slug => TRILHAS.find(t => t.slug === slug)
