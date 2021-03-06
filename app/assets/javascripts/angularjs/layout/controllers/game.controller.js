/**
* gameController
* @namespace gserver.layout.controllers
*/
(function () {
  'use strict';

  angular
    .module('gserver.layout.controllers')
    .controller('gameController', gameController);

  gameController.$inject = ['$scope','Layout','$stateParams','$state','$cookies','$timeout','$location'];

  /**
  * @namespace gameController
  */
  function gameController($scope, Layout,$stateParams,$state,$cookies,$timeout,$location) {

    var vm = this;
    vm.showpage = false;
    vm.game_info = {};
    vm.selected_grid = [];
    vm.selection_class_grid = [];
    vm.getGridLetter = getGridLetter;
    vm.toggleSelection = toggleSelection;
    vm.last_selected_grid_elem = [];
    vm.submitWord = submitWord;
    vm.dispatcher = null;
    vm.showStartBtn = showStartBtn;
    vm.channel = null;
    vm.player_nick = null;
    vm.game_step = {"word": "","score": "","success": false};
    vm.showMessageBox = false;
    vm.startErrorMsg = "";
    vm.submitcheck = submitcheck;
    vm.start_game = start_game;
    var url_base = $location.host() + ":" + $location.port();

    // Get params
    vm.gameid = $stateParams.game_id;
    vm.playerid = $stateParams.player_id;

    angular.element(document).ready(function () {
      vm.dispatcher = new WebSocketRails(url_base + '/websocket');
      vm.channel = vm.dispatcher.subscribe('play');
      vm.channel.bind('push_info', function(data) {
        if (vm.gameid === data.gameid) {
          vm.game_info = data;
          flushSelection();
          $scope.$apply();
        };
      });
    });
    
    // If null get from cookies
    if (vm.gameid == null) { 
      vm.gameid = $cookies.get('gameid')
    } else {
      $cookies.put('gameid',vm.gameid);
    };
    if (vm.playerid == null) { 
      vm.playerid = $cookies.get('playerid');
    } else {
      $cookies.put('playerid',vm.playerid);
    };

    // Redirect to homepage if game id is missing
    if (vm.gameid == null) { $state.go('home')};

    // Fetch game info
    Layout.game_info(vm.gameid,vm.playerid)
    .then(function successCallback (response) {
      vm.game_info = response.data;
      if (vm.game_info.grid.length > 0){
        vm.showpage = true;
        vm.player_nick = vm.game_info.players[vm.playerid];
        for (var i = 0; i < vm.game_info.grid_size; i++) {
          vm.selection_class_grid.push([]);
          for (var j = vm.game_info.grid_size - 1; j >= 0; j--) {
            vm.selection_class_grid[i].push(false);
          };
        };
      } else {
        alert("Invalid Game Id!!");
        $state.go('home');
      }
    },function failureCallback (response) {
      // body...
    });

    $scope.getNumber = function(num) {
      return new Array(num);  
    }
    function getGridLetter (i,j) {
      var index = i*vm.game_info.grid_size+j;
      return vm.game_info.grid[index]
    }
    function toggleSelection (i,j) {
      if (vm.last_selected_grid_elem.length > 0) {
        if (vm.last_selected_grid_elem[0] == i && vm.last_selected_grid_elem[1] == j) {
          vm.selection_class_grid[i][j] = !vm.selection_class_grid[i][j];
        } else if(vm.last_selected_grid_elem[0] != i && vm.last_selected_grid_elem[1] != j) {
          // Flush selection
          flushSelection();
          addElemToSelection(i,j);
        } else{
          var diff = vm.last_selected_grid_elem[0] - i + vm.last_selected_grid_elem[1] - j;
          if (diff == 1 || diff == -1) {
            addElemToSelection(i,j);
          } else {
            // Flush selection
            flushSelection();
            addElemToSelection(i,j);
          }
        }
      } else {
        addElemToSelection(i,j);
      }
    }
    function addElemToSelection (i,j) {
      vm.last_selected_grid_elem = [i,j];
      vm.selection_class_grid[i][j] = !vm.selection_class_grid[i][j];
      vm.selected_grid.push([i,j]);
    }
    function flushSelection(){
      for (var i = vm.selected_grid.length - 1; i >= 0; i--) {
        vm.selection_class_grid[vm.selected_grid[i][0]][vm.selected_grid[i][1]] = false; 
      };
      vm.selected_grid = [];
    }
    function success(response) {
      vm.game_step.score = response.score;
      vm.game_step.success = response.success;
      showMessage();
    }
    function failure(response) {
      // body...
    }
    function showMessage () {
      vm.showMessageBox = true;
      $scope.$apply();
      $timeout(function() {
        vm.showMessageBox = false;
      }, 3000);
    }
    function start_game () {
      Layout.start_game(vm.gameid,vm.playerid)
      .then(function successCallback (response) {
        if (response.data.success == false) {
          vm.startErrorMsg = response.data.message;
          $timeout(function() {
            vm.startErrorMsg = '';
          },3000);
        };
      },function failureCallback (response) {
        // body...
      })
    }
    function showStartBtn() {
      var show = vm.game_info.game_status == 'waiting';
      return show
    }
    function submitcheck () {
      return (vm.game_info.game_status != 'in_play' || vm.playerid != vm.game_info.current_player)
    }
    function submitWord(type){
      var word = '';
      if(type != 'pass'){
        for (var i = 0; i < vm.selected_grid.length; i++) {
          word+=getGridLetter(vm.selected_grid[i][0],vm.selected_grid[i][1]);
        };
      }
      vm.game_step.word = word;
      vm.dispatcher.trigger('submit_word', {"player_id": vm.playerid, "word": word,"game_id": vm.gameid},success,failure);
    }
  };
})();
