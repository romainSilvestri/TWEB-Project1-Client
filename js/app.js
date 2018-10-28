/* jslint browser: true */
/* global window */
/* global document */
/* global fetch */
/* global FusionCharts */
// https://medium.freecodecamp.org/environment-settings-in-javascript-apps-c5f9744282b6
const baseUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://heig-vd-ga-server.herokuapp.com';


const defaultSearch = 'octocat';
const searchForm = document.getElementById('search-form');
const search = document.getElementById('search');
const update = document.getElementById('update');
const pourcentageCommit = document.getElementById('pourcentageCommit');
const rankTitle = document.getElementById('rankTitle');
const descRank = document.getElementById('descRank');


function addUserInDb(username, freq) {
  return fetch(`${baseUrl}/add`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      username,
      frequencies: freq,
    }),
  })
    .catch((err) => {
      throw new Error(err.message);
    });
}

function searchUserInDb(username) {
  return fetch(`${baseUrl}/user`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      username,
    }),
  })
    .then(res => res.json())
    .catch((err) => {
      throw new Error(err.message);
    });
}

function getAllGlobalFrequenciesInDb() {
  return fetch(`${baseUrl}/frequencies`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
    .then(res => res.json())
    .catch((err) => {
      throw new Error(err.message);
    });
}

function getUser(username) {
  return fetch(`${baseUrl}/users/${username}`)
    .then(res => res.json());
}

function getGithubColors() {
  return fetch('data/github-colors.json')
    .then(res => res.json());
}

function getPageOfRepos(username, pageNumber) {
  return fetch(`${baseUrl}/users/${username}/repos?page=${pageNumber}&per_page=${100}`)
    .then(res => res.json());
}


// TEST, get all the repos
function getAllRepos(username, resultArr, pageNumber = 1) {
  return getPageOfRepos(username, pageNumber)
    .then((result) => {
      if (result.length === 0) {
        return resultArr;
      }
      if (result.length < 100) {
        return resultArr.concat(result);
      }

      const newArr = resultArr.concat(result);
      return getAllRepos(username, newArr, pageNumber + 1);
    });
}


function getPageOfContributors(username, repoName) {
  return fetch(`${baseUrl}/repos/${username}/${repoName}/stats/contributors?per_page=${100}`)
    .then(res => res.json());
}

function getNumberOfCommits(username, repoName) {
  return getPageOfContributors(username, repoName)
    .then((result) => {
      if (result.length === 0) {
        return 0;
      }

      for (let i = 0; i < result.length; i += 1) {
        if (result[i].author) {
          if (result[i].author.login.toLowerCase() === username.toLowerCase()) {
            return (result[i].total);
          }
        }
      }
      return 0;
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}


function getCommitsPage(username, repoName, pageNumber) {
  return fetch(`${baseUrl}/repos/${username}/${repoName}/commits?page=${pageNumber}&per_page=${100}`)
    .then(res => res.json());
}

function getFirstCommit(username, repoName) {
  return new Promise(((resolve) => {
    getCommitsPage(username, repoName, 1)
      .then((result) => {
        resolve(result[0]);
      });
  }));
}

function getLastCommit(username, repoName, numberOfCommits) {
  return new Promise(((resolve) => {
    let pageNumber = Math.floor(numberOfCommits / 100) + 1;
    let indexLastCommit = (numberOfCommits % 100) - 1;
    if (indexLastCommit < 0) {
      indexLastCommit = 100;
      pageNumber -= 1;
    }
    fetch(`${baseUrl}/repos/${username}/${repoName}/commits?page=${pageNumber}&per_page=${100}`)
      .then((res) => {
        res.json().then((result) => {
          resolve(result[indexLastCommit]);
        });
      });
  }));
}

// function that take array of array of two elements
// and merge array that have the same first element
function mergeArray(arr) {
  const retArray = arr;
  let l = arr.length;
  for (let i = 0; i < l; i += 1) {
    for (let j = i + 1; j < l; j += 1) {
      if (retArray[i][0] === retArray[j][0]) {
        retArray[i].push(retArray[j][1]);
        retArray.splice(j, 1);
        j -= 1;
        l -= 1;
      }
    }
  }
  return retArray;
}

// function that return an array containing the first element
// and the mean of all other elements of the parameter.
function averageFrequency(arr) {
  const retArray = [];
  retArray.push(arr[0]);
  let sumFrequency = 0;
  for (let i = 1; i < arr.length; i += 1) {
    sumFrequency += arr[i];
  }
  retArray.push(sumFrequency / (arr.length - 1));
  return retArray;
}

/**
 * this function return an array of json containing a language and a frequencies of commits per day
 * @param {*} username
 */
function getFrequencyOfCommits(username) {
  return new Promise(((resolve) => {
    let frequencies = [];
    const reposJSON = [];
    getAllRepos(username, reposJSON)
      .then((repos) => {
        const promises = [];
        const NameAndLanguage = [];

        for (let i = 0; i < repos.length; i += 1) {
          if (repos[i].language !== null) {
            promises.push(getNumberOfCommits(username, repos[i].name));
            NameAndLanguage.push([repos[i].name, repos[i].language]);
          }
        }

        Promise.all(promises).then((data) => {
          const promisesCommits = [];

          for (let i = 0, removedElem = 0; i < data.length; i += 1) {
            if (data[i] === 0 || data[i] === 1) {
              NameAndLanguage.splice(i - removedElem, 1);
              removedElem += 1;
            } else {
              const First = getFirstCommit(username, NameAndLanguage[i - removedElem][0]);
              const Last = getLastCommit(username, NameAndLanguage[i - removedElem][0], data[i]);
              promisesCommits.push([First, Last, data[i], NameAndLanguage[i - removedElem][1]]);
            }
          }

          Promise.all(promisesCommits.map(Promise.all, Promise)).then((Commits) => {
            Commits.forEach((element) => {
              const msPerDay = 24 * 60 * 60 * 1000;
              const d1 = new Date(element[0].commit.author.date);
              const d2 = new Date(element[1].commit.author.date);
              const d1Ms = d1.getTime();
              const d2Ms = d2.getTime();
              if ((d1Ms - d2Ms) >= msPerDay) {
                const frequency = element[2] * msPerDay / (d1Ms - d2Ms);
                frequencies.push([element[3], frequency]);
              }
            });
            let globalFrequency = 0;
            frequencies.forEach((element) => {
              globalFrequency += element[1];
            });
            globalFrequency /= frequencies.length;
            frequencies = mergeArray(frequencies);
            for (let i = 0; i < frequencies.length; i += 1) {
              frequencies[i] = averageFrequency(frequencies[i]);
            }
            frequencies.unshift(['global', globalFrequency]);
            const keys = ['language', 'frequency'];
            const objects = frequencies.map((array) => {
              const object = {};
              keys.forEach((key, i) => {
                object[key] = array[i];
              });
              return object;
            });
            resolve(objects);
          });
        });
      });
  }));
}

function getRank(frequency) {
  return getAllGlobalFrequenciesInDb()
    .then((result) => {
      let rank = 0;
      if (result.length === 0) {
        return [100, 1];
      }

      const frequencies = [];
      result.forEach((element) => {
        if (element.frequencies != null) {
          frequencies.push(element.frequencies[0].frequency);
        }
      });
      frequencies.sort((a, b) => a - b);
      let index = 0;
      while (frequencies[index] <= frequency && index < frequencies.length) {
        index += 1;
      }
      rank = index * 100 / frequencies.length;
      return [rank, frequencies.length];
    });
}


function updateChart({ backgroundColor, frequencies }) {
  const globalFrequency = frequencies[0].frequency;

  const dataCharts = [];
  let i = 0;
  frequencies.forEach((element) => {
    const item = { label: element.language, value: element.frequency, color: backgroundColor[i] };
    dataCharts.push(item);
    i += 1;
  });

  let dataSource = {
    chart: {
      caption: 'Commits/day depending on the language',
      xaxisname: 'language',
      yaxisname: 'frequency of commits',
      numbersuffix: '',
      theme: 'fusion',
      bgColor: '#F6FEFE',
    },
    data: dataCharts,
  };

  FusionCharts.ready(() => {
    new FusionCharts({
      type: 'column2d',
      renderAt: 'commits frequency',
      width: '100%',
      height: '100%',
      dataFormat: 'json',
      dataSource,
    }).render();
  });

  getRank(globalFrequency)
    .then((result) => {
      let value = result[0];
      value = Math.floor(value * 100) / 100;
      dataSource = {
        chart: {
          caption: 'Your rank',
          lowerlimit: '0',
          upperlimit: '100',
          showvalue: '1',
          numbersuffix: '%',
          theme: 'fusion',
          showtooltip: '0',
          bgColor: '#F6FEFE',
        },
        colorrange: {
          color: [
            {
              minvalue: '0',
              maxvalue: '25',
              code: '#F2726F',
            },
            {
              minvalue: '25',
              maxvalue: '50',
              code: '#FF8040',
            },
            {
              minvalue: '50',
              maxvalue: '75',
              code: '#FFC533',
            },
            {
              minvalue: '75',
              maxvalue: '100',
              code: '#62B58F',
            },
          ],
        },
        dials: {
          dial: [
            {
              value,
            },
          ],
        },
      };

      FusionCharts.ready(() => {
        new FusionCharts({
          type: 'angulargauge',
          renderAt: 'chart-container',
          width: '50%',
          height: '20%',
          dataFormat: 'json',
          dataSource,
        }).render();
      });
      pourcentageCommit.innerHTML = `You are committing more frequently than ${value} % of the people that used this app`;
      let title = 'Your rank : ';
      let description;
      if (value === 0) {
        title = title.concat('<strong>The useless</strong>');
        description = "Well, that not really good to be the last. Are you using git ? Are you even alive ?<br/>You really need to commit more or other people won't work with you again.";
      } else if (value < 25) {
        title = title.concat('<strong>Git Neophyte</strong>');
        description = 'You are way below average. You really need to understand what is github. Just keep trying and you may progress toward the top';
      } else if (value < 50) {
        title = title.concat('<strong>Git Junior Adept</strong>');
        description = 'You are bellow average but it could be worst. You have just to commit more often when you work on project but it seems that you understand the principle of Github';
      } else if (value < 75) {
        title = title.concat('<strong>Git Royal administrator</strong>');
        description = "You are beyong average, that's GREAT. You know what you do and you work efficiently. Just keep going.";
      } else if (value < 100) {
        title = title.concat('<strong>Git Master</strong>');
        description = "You are part of the top Github user. People that work with you doesn't have time to ask you if you have push, your team almost have a live view of your project.<br/>Let's just hope that those stats are not boosted by some rush in projects...";
      } else {
        title = title.concat('<strong>The Almighty</strong>');
        description = 'You are THE ONE. Nobody commit more than you, Congratulation !';
      }
      rankTitle.innerHTML = title;
      if (result[1] < 10) {
        description = description.concat("<br/><br/><br/>* You shouldn't take this result really seriously, less than 10 people are currently registered in the database.<br/>Tell your friends to use this app as well so the stats will be better !");
      }
      descRank.innerHTML = description;
    });
}

function updateProfile(user) {
  const avatar = document.getElementById('user-avatar');
  const name = document.getElementById('user-name');
  const login = document.getElementById('user-login');
  avatar.src = user.avatar_url;
  avatar.alt = `avatar of ${user.name}`;
  name.innerHTML = user.name;
  login.innerHTML = user.login;
}

function updatePlaceholder(content, className = 'text-secondary') {
  const placeholder = document.getElementById('placeholder');
  placeholder.className = className;
  placeholder.innerHTML = content;
}

function handleSearch(username, checkDB = true) {
  updatePlaceholder('Loading...');
  let isInDb = false;
  searchUserInDb(username.toLowerCase())
    .then((result) => {
      if (result != null) {
        isInDb = true;
      }
      if (checkDB === true && isInDb === true) {
        Promise.all([
          getUser(username),
          getGithubColors(),
        ])
          .then(([user, colors]) => {
            updatePlaceholder('');
            const freq = result.frequencies;
            const labels = [];
            freq.forEach((element) => { labels.push(element.language); });
            const backgroundColor = labels.map((label) => {
              const color = colors[label] ? colors[label].color : null;
              return color || '#000';
            });

            updateProfile(user);
            updateChart({ backgroundColor, frequencies: freq });
          })
          .catch((err) => {
            updatePlaceholder('Oups, an error occured. Sorry, this app sucks...', 'text-error');
            throw new Error(err.message);
          });
      } else {
        Promise.all([
          getUser(username),
          getFrequencyOfCommits(username),
          getGithubColors(),
        ])
          .then(([user, frequencies, colors]) => {
            updatePlaceholder('');

            const labels = [];
            frequencies.forEach((element) => { labels.push(element.language); });
            const backgroundColor = labels.map((label) => {
              const color = colors[label] ? colors[label].color : null;
              return color || '#000';
            });

            updateProfile(user);
            addUserInDb(user.login.toLowerCase(), frequencies)
              .then(updateChart({
                backgroundColor, frequencies,
              }));
          })
          .catch((err) => {
            updatePlaceholder('Oups, an error occured. Sorry, this app sucks...', 'text-error');
            throw new Error(err.message);
          });
      }
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}

search.addEventListener('click', (e) => {
  e.preventDefault();
  const username = searchForm.elements.username.value;
  if (!username) {
    return;
  }
  handleSearch(username, true);
});

update.addEventListener('click', (e) => {
  e.preventDefault();
  const username = searchForm.elements.username.value;
  if (!username) {
    return;
  }
  handleSearch(username, false);
});

handleSearch(defaultSearch);
