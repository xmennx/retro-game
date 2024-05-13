import gamePlay from "./GamePlay";
import themes from "./themes";
import Team from "./Team.js";
import { generateTeam } from "./generators.js";
import PositionedCharacter from "./PositionedCharacter.js";
import GameState from "./GameState.js";
import getRandomUserPosition from "./getRandomUserPosition.js";
import getRandomEnemyPosition from "./getRandomEnemyPosition.js";
import Bowerman from "./characters/Bowerman.js";
import Magician from "./characters/Magician.js";
import daemon from "./characters/Daemon.js";
import Swordsman from "./characters/Swordsman.js";
import Undead from "./characters/Undead.js";
import Vampire from "./characters/Vampire.js";
// import Character from "./Character.js";

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.gameState = new GameState();
    this.stateService = stateService;

    this.userTeam = new Team(); // команда user
    this.userPositions = []; // позиции команды user
    this.userTeamWithPosition = []; //объекты персонаж-позиция команды user
    this.enemyTeam = new Team(); // команда enemy
    this.enemyPositions = []; // позиции команды enemy
    this.enemyTeamWithPosition = []; //объекты персонаж-позиция команды enemy
  }

  init() {
    // начало игры
    this.gamePlay.drawUi(themes[this.gameState.level]); //отрисовка оформления уровня

    this.userTeam = generateTeam([Magician, Bowerman, Swordsman], 1, 2); //создание команды user

    this.userPositions = getRandomUserPosition(); //создание рандомных позиций

    for (let i = 0; i < this.userTeam.length; i++) {
      let fighterAndPosition = new PositionedCharacter(
        this.userTeam[i],
        this.userPositions[i]
      ); //создание объекта типа PositionedCharacter
      this.userTeamWithPosition.push(fighterAndPosition); //добавление в userTeamWithPosition
      this.gameState.heroesList.push(fighterAndPosition); //добавление в heroesList
    }

    this.enemyTeam = generateTeam([Undead, daemon, Vampire], 1, 2); //создание команды enemy

    this.enemyPositions = getRandomEnemyPosition(); //создание рандомных позиций

    for (let i = 0; i < this.enemyTeam.length; i++) {
      let fighterAndPosition = new PositionedCharacter(
        this.enemyTeam[i],
        this.enemyPositions[i]
      ); //создание объекта типа PositionedCharacter
      this.enemyTeamWithPosition.push(fighterAndPosition); //добавление в enemyTeamWithPosition и в heroesList
      this.gameState.heroesList.push(fighterAndPosition); //добавление в heroesList
    }

    this.gamePlay.redrawPositions([
      // отрисовка персонажей
      ...this.userTeamWithPosition,
      ...this.enemyTeamWithPosition,
    ]);

    this.gamePlay.addCellEnterListener((index) => {
      this.onCellEnter(index); // отслеживание наведения курсора на ячейку
    });

    this.gamePlay.addCellClickListener((index) => {
      this.gamePlay.cells.forEach((elem) => elem.classList.remove("selected")); // удаление класса selected со всех персонажей
      this.onCellClick(index); // отслеживание клика по индексу
    });

    this.gamePlay.addCellLeaveListener((index) => {
      this.onCellLeave(index); //логика при покидании фокуса клетки
    });

    this.gamePlay.addNewGameListener(() => {
      const gameController = new GameController(
        this.gamePlay,
        this.stateService
      );
      gameController.init(); // при нажатии на new game начинается новая игра
    });

    this.gamePlay.addSaveGameListener(() => {
      // сохранение игры
      this.stateService.save(GameState.from(this.gameState));
      if (localStorage.getItem("state") === null) {
        gamePlay.showMessage("Игра не сохранилась");
      }
      gamePlay.showMessage("Игра сохранена");
    });

    this.gamePlay.addLoadGameListener(() => {
      // загрузка игры
      const loadGame = this.stateService.load();
      if (!loadGame) {
        gamePlay.showError("Отсутствует сохраненная игра");
      }
      this.gameState.level = loadGame.level;
      this.gamePlay.drawUi(themes[loadGame.level]);
      this.gameState.permissionMove = loadGame.permissionMove;
      this.gameState.heroesList = [];
      this.gameState.points = loadGame.points;
      this.gameState.statistic = loadGame.statistic;
      this.gameState.characterSelected = loadGame.characterSelected;
      this.userTeam = new Team();
      this.rivalTeam = new Team();

      loadGame.heroesList.forEach((elem) => {
        let char;
        switch (elem.character.type) {
          case "swordsman":
            char = new Swordsman(elem.character.level);
            this.userTeam.addAll([char]);
            break;
          case "bowman":
            char = new Bowerman(elem.character.level);
            this.userTeam.addAll([char]);
            break;
          case "magician":
            char = new Magician(elem.character.level);
            this.userTeam.addAll([char]);
            break;
          case "undead":
            char = new Undead(elem.character.level);
            this.rivalTeam.addAll([char]);
            break;
          case "vampire":
            char = new Vampire(elem.character.level);
            this.rivalTeam.addAll([char]);
            break;
          case "daemon":
            char = new daemon(elem.character.level);
            this.rivalTeam.addAll([char]);
            break;
        }
        char.health = elem.character.health;

        this.gameState.heroesList.push(
          new PositionedCharacter(char, elem.position)
        );
      });

      this.gamePlay.redrawPositions(this.gameState.heroesList);
      gamePlay.showMessage("Игра загружена");
    });
  }

  onCellClick(index) {
    if (this.findPersonByIndex(index)) {
      //проверка. был ли клик совершен на персонаже
      const hero = this.findPersonByIndex(index).character;

      if (
        // проверка типа персонажа
        hero instanceof Swordsman ||
        hero instanceof Bowerman ||
        hero instanceof Magician
      ) {
        if (
          !this.gameState.characterSelected &&
          !this.gameState.permissionMove
        ) {
          // провекра есть ли выбранный персонаж
          this.gamePlay.selectCell(index); // Подсвечивание игрока

          this.gameState.characterSelected = index; //запись, что игрок был выбран

          this.gameState.permissionMove = true; // ход разрешен

          this.findBorder(); // поиск границ поля

          this.countSquare = this.findCountSquare(index); // поиск количества квадратиков. максимальная величина шага
          this.allowIndexsMove = this.calcMove(this.countSquare, index); // доступные индексы для ходьбы

          this.countAttack = this.findAttackSquare(index); // поиск количества квадратиков. максимальная величина атаки
          this.allowIndexsAttack = this.calcAttack(this.countAttack, index); // доступные индексы для атаки
        } else {
          // при нажатии на своего союхника
          this.gameState.characterSelected = null; // если есть выбранные персонаж, то записываем null
          this.gameState.permissionMove = false; // если есть выбранный персонаж, то запрещаем ход
        }
      } else if (
        this.gameState.characterSelected &&
        !this.allowIndexsAttack.includes(index)
      ) {
        // при нажатии в недоступное зоне атаки
        this.gameState.characterSelected = null; // если есть выбранные персонаж, то записываем null
        this.gameState.permissionMove = false; // если есть выбранный персонаж, то запрещаем ход
        return;
      }

      if (!this.gameState.characterSelected && this.findEnemyPerson(index)) {
        gamePlay.showError("Нельзя управлять персонажем из команды врага!"); // выбрасывание ошибки при попытке сходить за врага
      }

      // нанесение урона врагу
      if (
        this.findEnemyPerson(index) &&
        this.gameState.permissionMove &&
        this.gameState.characterSelected &&
        this.allowIndexsAttack.includes(index)
      ) {
        // если выбран персонаж и доступно перемещение и в индекске для атаки есть персонаж врага
        let target = this.findPersonByIndex(index); // поиск цели
        let attacker = this.findPersonByIndex(this.gameState.characterSelected); // поиск атакующего

        let damage = Math.max(
          attacker.character.attack - target.character.defence,
          attacker.character.attack * 0.1
        ); // подсчет урона

        this.gamePlay.showDamage(index, damage).then(() => {
          target.character.health -= damage; // уменьшение жизни у цели
          this.gamePlay.redrawPositions(this.gameState.heroesList);
          if (target.character.health <= 0) {
            // если жизней 0 то удаляем персонажа
            this.enemyTeam.splice(this.enemyTeam.indexOf(target), 1);
            this.enemyTeamWithPosition.splice(
              this.enemyTeamWithPosition.indexOf(target),
              1
            );
            this.gameState.heroesList.splice(
              this.gameState.heroesList.indexOf(target),
              1
            );
            this.gamePlay.redrawPositions(this.gameState.heroesList);

            //СУПЕРСИЛА У КОМПЬЮТЕРА
            if (this.enemyTeam.length == 1) {
              gamePlay.showMessage("ВНИМАНИЕ, ВКЛЮЧЕН СУПЕР-РЕЖИМ!");
              this.gamePlay.redrawPositions(this.gameState.heroesList);
              let idxPrs = this.enemyTeamWithPosition[0].position;
              let pers = this.findPersonByIndex(idxPrs);
              pers.character.attack += pers.character.attack * 0.25; // увеличили атаку игрока компьютера
              pers.character.health += pers.character.health * 0.25; // увеличили здоровье игрока компьютера
              this.gamePlay.redrawPositions(this.gameState.heroesList);
            }
            //СУПЕРСИЛА У КОМПЬЮТЕРА

            if (this.enemyTeam.length === 0) {
              if (this.enemyTeam.length === 0 && this.gameState.level === 5) {
                gamePlay.showMessage("Вы победили! Игра окончена!");
                return;
              }
              // если не осталось персонажей у компьютера то следующий уровень
              this.nextLevel();
            } else {
              // иначе ход комьютера
              this.enemyAttackUser();
              this.gamePlay.redrawPositions(this.gameState.heroesList);
            }
          } else this.enemyAttackUser(); // иначе ход компьютера
        });

        this.gameState.characterSelected = null; // если есть выбранные персонаж, то записываем null
        this.gameState.permissionMove = false; // если есть выбранный персонаж, то запрещаем ход
      }
    }

    // Перемещение персонажа пользователя

    if (
      //проверка, что нажатая ячейка с таким то индексом не содрежит игрока user или enemy. Проверка permissionMove
      !this.findPersonByIndex(index) &&
      this.gameState.permissionMove &&
      this.allowIndexsMove.includes(index)
    ) {
      this.userMoveClickIndex(index); // перемещение персонажа на выбранную ячейку
      this.gamePlay.cells.forEach(
        (elem) => elem.classList.remove("selected-green") // удаление курсора выбора ячейки
      );
    } else if (this.gameState.characterSelected) {
      // курсор чтобы сбрасывался при нажатии на индекс ячейки недоступный для ходьбы на своего персонажа
      if (!this.findPersonByIndex(index)) {
        this.gameState.characterSelected = null;
        this.gameState.permissionMove = false;
      }
    }
  }

  onCellEnter(index) {
    // метод работает при наведении курсора на персонажа.
    if (this.findPersonByIndex(index)) {
      const hero = this.findPersonByIndex(index).character;
      const message = `\u{1F396}${hero.level}\u{2694}${hero.attack}\u{1F6E1}${hero.defence}\u{2764}${hero.health}`;
      this.gamePlay.showCellTooltip(message, index); // если сработает метод findPersonByIndex то выведется окошоко с сообщением
    }

    if (this.findUserPerson(index)) {
      this.gamePlay.setCursor("pointer"); //pointer при выборе игрока
    }

    if (
      this.gameState.characterSelected !== null &&
      !this.findPersonByIndex(index) &&
      this.allowIndexsMove.includes(index) &&
      this.gameState.permissionMove
    ) {
      this.gamePlay.setCursor("pointer");
      this.gamePlay.selectCell(index, "green"); //зеленый круг при выборе ячейки поля для ходьбы. С ограничениями в зависимости от типа персонажа.
      this.gameState.permissionMove = true;
    }

    if (
      this.gameState.characterSelected &&
      this.findEnemyPerson(index) &&
      this.allowIndexsAttack.includes(index)
    ) {
      this.gamePlay.setCursor("crosshair");
      this.gamePlay.selectCell(index, "red"); // красный круг при выборе атаки во время хода игрока
    }

    if (
      this.gameState.characterSelected &&
      !this.allowIndexsMove.includes(index) &&
      !this.findPersonByIndex(index)
    ) {
      this.gamePlay.setCursor("not-allowed"); //при недопустимых условиях курсор not-allowed
    }
  }

  onCellLeave(index) {
    //логика при покидании фокуса ячейки
    this.gamePlay.cells.forEach((elem) =>
      elem.classList.remove("selected-red")
    );
    this.gamePlay.cells.forEach((elem) =>
      elem.classList.remove("selected-green")
    );
    this.gamePlay.hideCellTooltip(index);
    this.gamePlay.setCursor("auto");
  }

  findPersonByIndex(index) {
    // поиск игрока по индексу ячейки
    return this.gameState.heroesList.find(
      (person) => person.position === index
    );
  }

  findUserPerson(index) {
    // поиск игрока user по индексу
    return this.userTeamWithPosition.find(
      (person) => person.position === index
    );
  }

  findEnemyPerson(index) {
    // поиск игрока Enemy по индексу
    return this.enemyTeamWithPosition.find(
      (person) => person.position === index
    );
  }

  findtSelectedCharacter() {
    // поиск выбранного игрока
    return this.gameState.heroesList.find(
      (elem) => elem.position === this.gameState.characterSelected
    );
  }

  findBorder() {
    // границы
    this.leftBorder = []; //левая граница
    this.rightBorder = []; //правая граница

    for (
      // заполнение левой и правой границ
      let i = 0, j = this.gamePlay.boardSize - 1;
      this.leftBorder.length < this.gamePlay.boardSize;
      i += this.gamePlay.boardSize, j += this.gamePlay.boardSize
    ) {
      this.leftBorder.push(i);
      this.rightBorder.push(j);
    }

    this.upBorder = []; //верхняя и нижняя граница
    this.downBorder = []; //нижняя и нижняя граница

    for (
      // заполнение верхней и нижней границ
      let i = 0, j = this.gamePlay.boardSize * this.gamePlay.boardSize - 1;
      this.upBorder.length < this.gamePlay.boardSize;
      i += 1, j -= 1
    ) {
      this.upBorder.push(i);
      this.downBorder.push(j);
    }
    //границы
  }

  findCountSquare(index) {
    //возвращение числа возможных ячеек при ходьбе в зависимости от типа персонажа
    const pers = this.findPersonByIndex(index);
    if (pers.character.type == "swordsman" || pers.character.type == "undead") {
      let countSquare = 4;
      return countSquare;
    }
    if (pers.character.type == "bowman" || pers.character.type == "vampire") {
      let countSquare = 2;
      return countSquare;
    }
    if (pers.character.type == "magician" || pers.character.type == "daemon") {
      let countSquare = 1;
      return countSquare;
    }
  }

  calcMove(countSquare, indexSelected) {
    this.allowIndexsMove = [];
    let rightIndex = [];
    let leftIndex = [];
    let upIndex = [];
    let downIndex = [];

    //клетки по вертикали
    for (let i = 1; i <= countSquare; i++) {
      //проверка является ли клетка на которой стоит игрок границей. если нет то пушим в доступные для ходьбы индексы

      if (!this.upBorder.includes(indexSelected)) {
        const index = indexSelected - this.gamePlay.boardSize * i;
        if (index >= 0) {
          this.allowIndexsMove.push(
            indexSelected - this.gamePlay.boardSize * i
          ); // клетки сверху
          upIndex.push(index);
        }
      }

      if (!this.downBorder.includes(indexSelected)) {
        const index = indexSelected + this.gamePlay.boardSize * i;
        if (index < this.gamePlay.boardSize ** 2) {
          this.allowIndexsMove.push(
            indexSelected + this.gamePlay.boardSize * i
          ); // клетки снизу
          downIndex.push(index);
        }
      }
    }
    //клетки по вертикали

    //клетки справа
    for (let i = 1; i <= countSquare; i++) {
      if (this.rightBorder.includes(indexSelected)) {
        //проверка является ли клетка на которой персонаж границей.
        break;
      }

      this.allowIndexsMove.push(indexSelected + i); // клетки справа
      rightIndex.push(indexSelected + i);

      let diagDownRight = indexSelected + (this.gamePlay.boardSize * i + i); // клетки снизу по диагонали справа
      if (diagDownRight < this.gamePlay.boardSize ** 2) {
        this.allowIndexsMove.push(diagDownRight);
        rightIndex.push(diagDownRight);
      }

      let diagUpRight = indexSelected - (this.gamePlay.boardSize * i - i); // клетки справа сверху по диагонали
      if (diagUpRight >= 0) {
        this.allowIndexsMove.push(diagUpRight);
        rightIndex.push(diagUpRight);
      }

      if (this.rightBorder.includes(indexSelected + i)) break;
    }
    //клетки справа

    //клетки слева
    for (let i = 1; i <= countSquare; i++) {
      if (this.leftBorder.includes(indexSelected)) {
        //проверка является ли клетка на которой персонаж границей.
        break;
      }
      this.allowIndexsMove.push(indexSelected - i); // клетки слева
      leftIndex.push(indexSelected - i);

      let diagDownLeft = indexSelected + (this.gamePlay.boardSize * i - i); // клетки слева по диагонали снизу
      if (diagDownLeft < this.gamePlay.boardSize ** 2) {
        this.allowIndexsMove.push(diagDownLeft); // клетки слева по диагонали снизу
        leftIndex.push(diagDownLeft);
      }

      let diagUpLeft = indexSelected - (this.gamePlay.boardSize * i + i); // клетки слева сверху по диагонали
      if (diagUpLeft >= 0) {
        this.allowIndexsMove.push(diagUpLeft); // клетки сверху по диагонали слева
        leftIndex.push(diagUpLeft);
      }

      if (this.leftBorder.includes(indexSelected - i)) break;
    }
    //клетки слева

    return this.allowIndexsMove;
  }

  userMoveClickIndex(index) {
    if (this.findtSelectedCharacter()) {
      this.findtSelectedCharacter().position = index; // поиск персонажа по индексу и замена этого индекса
      this.gamePlay.deselectCell(this.gameState.characterSelected); // удаление выбранных персонажей
      this.gamePlay.redrawPositions(this.gameState.heroesList); // перерисовка позиций персонажей
      this.gameState.characterSelected = null;
      this.gameState.permissionMove = false;
      this.enemyAttackUser();
    } else {
      this.gameState.characterSelected.position = index; // поиск персонажа по индексу и замена этого индекса
      // this.gamePlay.deselectCell(this.gameState.characterSelected); // удаление выбранных персонажей
      this.gamePlay.redrawPositions(this.gameState.heroesList); // перерисовка позиций персонажей
      this.gameState.characterSelected = null;
      this.gameState.permissionMove = false;
    }
  }

  findAttackSquare(index) {
    //возвращение числа возможных ячеек при атаке в зависимости от типа персонажа
    const pers = this.findPersonByIndex(index);
    if (pers.character.type == "swordsman" || pers.character.type == "undead") {
      let attackSquare = 1;
      return attackSquare;
    }
    if (pers.character.type == "bowman" || pers.character.type == "vampire") {
      let attackSquare = 2;
      return attackSquare;
    }
    if (pers.character.type == "magician" || pers.character.type == "daemon") {
      let attackSquare = 4;
      return attackSquare;
    }
  }

  calcAttack(countAttack, indexSelected) {
    //надо сделать радиус атаки

    this.allowIndexsAttack = [];

    let rightIndex = [];
    let leftIndex = [];
    let upIndex = [];
    let downIndex = [];

    // клетки по вертикали
    for (let i = 1; i <= countAttack; i++) {
      if (!this.upBorder.includes(indexSelected)) {
        const index = indexSelected - this.gamePlay.boardSize * i;
        if (index >= 0) {
          this.allowIndexsAttack.push(
            indexSelected - this.gamePlay.boardSize * i
          ); // клетки сверху
          upIndex.push(index);
        }
      }

      if (!this.downBorder.includes(indexSelected)) {
        const index = indexSelected + this.gamePlay.boardSize * i;
        if (index < this.gamePlay.boardSize ** 2) {
          this.allowIndexsAttack.push(
            indexSelected + this.gamePlay.boardSize * i
          ); // клетки снизу
          downIndex.push(index);
        }
      }
    }
    // клетки по вертикали

    //клетки справа
    for (let i = 1; i <= countAttack; i++) {
      if (this.rightBorder.includes(indexSelected)) {
        //проверка является ли клетка на которой персонаж границей.
        break;
      }

      let rightedIndex = indexSelected + i;
      let lineUp = indexSelected - this.gamePlay.boardSize * i;
      let lineDown = indexSelected + this.gamePlay.boardSize * i;

      if (!this.leftBorder.includes(rightedIndex)) {
        this.allowIndexsAttack.push(rightedIndex); // клетки справа
        rightIndex.push(rightedIndex);
      }

      if (lineUp < 0) {
        console.log("linup < 0");
      } else {
        for (let k = 1; k <= countAttack; k++) {
          if (!this.leftBorder.includes(lineUp + k)) {
            this.allowIndexsAttack.push(lineUp + k); // клетка сверху справа
            rightIndex.push(lineUp + k);
          }
        }
      }

      if (lineDown >= this.gamePlay.boardSize ** 2) {
        console.log("lineDown >= this.gamePlay.boardSize ** 2");
      } else {
        for (let k = 1; k <= countAttack; k++) {
          if (
            !this.leftBorder.includes(lineDown + k) &&
            lineDown + k < this.gamePlay.boardSize ** 2
          ) {
            this.allowIndexsAttack.push(lineDown + k); // клетка снизу справа
            rightIndex.push(lineDown + k);
          }
        }
      }
    }
    //клетки справа

    //клетки слева
    for (let i = 1; i <= countAttack; i++) {
      if (this.leftBorder.includes(indexSelected)) {
        //проверка является ли клетка на которой персонаж границей.
        break;
      }

      let leftedIndex = indexSelected - i;
      let lineUp = indexSelected - this.gamePlay.boardSize * i;
      let lineDown = indexSelected + this.gamePlay.boardSize * i;

      if (!this.rightBorder.includes(leftedIndex)) {
        this.allowIndexsAttack.push(leftedIndex); // клетки слева
        leftIndex.push(leftedIndex);
      }

      if (lineUp < 0) {
        console.log('lineUp < 0')
      } else {
        for (let k = 1; k <= countAttack; k++) {
          if (!this.rightBorder.includes(lineUp - k)) {
            this.allowIndexsAttack.push(lineUp - k); // клетка сверху слева
            leftIndex.push(lineUp - k);
          }
        }
      }

      if (lineDown >= this.gamePlay.boardSize ** 2) {
        console.log("lineDown >= this.gamePlay.boardSize ** 2");
      } else {
        for (let k = 1; k <= countAttack; k++) {
          if (!this.rightBorder.includes(lineDown - k) && lineDown - k > 0) {
            this.allowIndexsAttack.push(lineDown - k); // клетка снизу слева
            leftIndex.push(lineDown - k);
          }
        }
      }
    }
    //клетки слева

    return this.allowIndexsAttack;
  }

  enemyAttackUser() {
    if (this.gameState.permissionMove) {
      return;
    }

    let attacker = null;
    let target = null;
    let countAttack;
    let indexsAttack;
    let countSquare;
    let indexsMove;

    if (
      this.enemyTeamWithPosition.length === 0 ||
      this.userTeamWithPosition.length === 0
    ) {
      return;
    }

    this.enemyTeamWithPosition.forEach((enemy) => {
      countAttack = this.findAttackSquare(enemy.position); //поиск количество клеток для атаки
      indexsAttack = this.calcAttack(countAttack, enemy.position); // поиск индексов для атаки
      countSquare = this.findCountSquare(enemy.position); // поис количества клеток для ходьбы
      indexsMove = this.calcMove(countSquare, enemy.position); // поиск индексов для ходьбы

      this.userTeamWithPosition.forEach((hero) => {
        if (indexsAttack.includes(hero.position)) {
          // если индексы для атаки содержат позицию игрока user
          attacker = enemy;
          target = hero;
        }
      });
    });

    if (target) {
      //если есть цель то  бьем по ней
      let damage = Math.max(
        attacker.character.attack - target.character.defence,
        attacker.character.attack * 0.1
      );

      this.gamePlay.showDamage(target.position, damage).then(() => {
        target.character.health -= damage; // уменьшаем здоровье
        this.gamePlay.redrawPositions(this.gameState.heroesList);
        if (target.character.health <= 0) {
          // если жизней стало 0 то удаляем персонажа
          // this.gamePlay.userTeam.splice(this.userTeam.indexOf(target), 1);

          this.userTeamWithPosition.splice(
            this.userTeamWithPosition.indexOf(target),
            1
          );

          this.gameState.heroesList.splice(
            this.gameState.heroesList.indexOf(target),
            1
          );

          this.gamePlay.redrawPositions(this.gameState.heroesList);

          if (this.userTeamWithPosition.length === 0) {
            gamePlay.showMessage("Вы проиграли!"); // сообщение при потери всех игроков команды user
          }
        }
      });
    } else {
      // если цели нет то перемещаемся рандомно
      this.gameState.characterSelected =
        this.enemyTeamWithPosition[
          Math.floor(Math.random() * this.enemyTeamWithPosition.length)
        ]; // делаем что выбран игрок компьютера
      let randomIndexMove =
        indexsMove[Math.floor(Math.random() * indexsMove.length)]; // генерируем рандомный индекс

      while (
        this.findEnemyPerson(randomIndexMove) &&
        this.findUserPerson(randomIndexMove)
      ) {
        randomIndexMove =
          indexsMove[Math.floor(Math.random() * indexsMove.length)];
      } // генерируем рандомный индекс пока он не перестанет совпадать с имеющимеся в команде компьютера

      this.userMoveClickIndex(randomIndexMove); // перемещаем персонажа
    }
  }

  levelUP(person) {
    if (person.health <= 50) {
      // если здоровье персонажа <= 50 то считается вот так
      person.attack *= 1.3;
      person.defence *= 1.3;
    }
    person.health + 80 > 100 ? (person.health = 100) : (person.health += 80); // подсчет здоровья
    person.level++; // увеличение уровня
  }

  nextLevel() {
    this.gameState.level++; // увеличение уровня

    gamePlay.showMessage(
      `Уровень ${this.gameState.level}` +
        ` Ваше количество очков ${this.scorePoints()}`
    ); // показываем сообщение о смене уровня

    this.gamePlay.drawUi(themes[this.gameState.level]); // перерисовываем уровень

    for (const person of this.userTeam) {
      this.levelUP(person); // увеличение уровня каждому из оставшихся персонажей команды user
    }

    if (this.gameState.level == 2) {
      // если уровень == 2

      let randomPos = getRandomUserPosition();

      for (let i = 0; i < this.userTeamWithPosition.length; i++) {
        this.userTeamWithPosition[i].position = randomPos[i];
      }

      this.enemyTeam = generateTeam([Undead, daemon, Vampire], 1, 2); //создание команды enemy

      this.enemyPositions = getRandomEnemyPosition(); //создание рандомных позиций

      for (let i = 0; i < this.enemyTeam.length; i++) {
        let fighterAndPosition = new PositionedCharacter(
          this.enemyTeam[i],
          this.enemyPositions[i]
        ); //создание объекта типа PositionedCharacter
        this.enemyTeamWithPosition.push(fighterAndPosition); //добавление в enemyTeamWithPosition и в heroesList
        this.gameState.heroesList.push(fighterAndPosition); //добавление в heroesList
      }
    }

    if (this.gameState.level == 3) {
      // если уровень == 3

      let randomPos = getRandomUserPosition();

      for (let i = 0; i < this.userTeamWithPosition.length; i++) {
        this.userTeamWithPosition[i].position = randomPos[i];
      }

      this.enemyTeam = generateTeam([Undead, daemon, Vampire], 3, 2); //создание команды enemy

      this.enemyPositions = getRandomEnemyPosition(); //создание рандомных позиций

      for (let i = 0; i < this.enemyTeam.length; i++) {
        let fighterAndPosition = new PositionedCharacter(
          this.enemyTeam[i],
          this.enemyPositions[i]
        ); //создание объекта типа PositionedCharacter
        this.enemyTeamWithPosition.push(fighterAndPosition); //добавление в enemyTeamWithPosition и в heroesList
        this.gameState.heroesList.push(fighterAndPosition); //добавление в heroesList
      }
    }

    if (this.gameState.level == 4) {
      // если уровень == 4

      let randomPos = getRandomUserPosition();

      for (let i = 0; i < this.userTeamWithPosition.length; i++) {
        this.userTeamWithPosition[i].position = randomPos[i];
      }

      this.enemyTeam = generateTeam([Undead, daemon, Vampire], 4, 2); //создание команды enemy

      this.enemyPositions = getRandomEnemyPosition(); //создание рандомных позиций

      for (let i = 0; i < this.enemyTeam.length; i++) {
        let fighterAndPosition = new PositionedCharacter(
          this.enemyTeam[i],
          this.enemyPositions[i]
        ); //создание объекта типа PositionedCharacter
        this.enemyTeamWithPosition.push(fighterAndPosition); //добавление в enemyTeamWithPosition и в heroesList
        this.gameState.heroesList.push(fighterAndPosition); //добавление в heroesList
      }
    }

    if (this.gameState.level == 5) {
      // если уровень == 5

      let randomPos = getRandomUserPosition();

      for (let i = 0; i < this.userTeamWithPosition.length; i++) {
        this.userTeamWithPosition[i].position = randomPos[i];
      }

      this.enemyTeam = generateTeam([Undead, daemon, Vampire], 5, 2); //создание команды enemy

      this.enemyPositions = getRandomEnemyPosition(); //создание рандомных позиций

      for (let i = 0; i < this.enemyTeam.length; i++) {
        let fighterAndPosition = new PositionedCharacter(
          this.enemyTeam[i],
          this.enemyPositions[i]
        ); //создание объекта типа PositionedCharacter
        this.enemyTeamWithPosition.push(fighterAndPosition); //добавление в enemyTeamWithPosition и в heroesList
        this.gameState.heroesList.push(fighterAndPosition); //добавление в heroesList
      }
    }

    this.gamePlay.redrawPositions(this.gameState.heroesList); // перерисовываем игроков
  }

  scorePoints() {
    // подсчет очков
    console.log("подсчет очков");
    let points = 0;
    for (const pers of this.userTeam) {
      points += pers.health;
    }
    return points;
  }
}
console.log(GameController);