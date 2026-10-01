
    /* =================================================================================
       ★ Google Sheets 실시간 연동 — 아래 코드는 시트에서 데이터를 읽어
         DASHBOARD_DATA 객체를 자동으로 구성합니다.
         데이터 수정은 구글 시트에서 하세요! (HTML을 다시 만들 필요 없음)
       ================================================================================= */
    const SHEET_ID = '1fpdq2TzIblWrIFVg5ArCaGtC0j9G8sdc29prleBCXuA';
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit';
    const SHEET_TABS = ['설정','연혁','KPI','선순환체계','3대전략','로드맵','오픈랩_절차','오픈랩_선정과제','오픈랩_지원사항','대학파트너십','실증운영체계','윤리원칙','AI기본법','개인정보보호법','투명성이행절차','문화확산','외부거버넌스','교육현황'];
    let DASHBOARD_DATA = null;

    function gvizUrl(tab, cb){
      return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq'
        + '?tqx=' + encodeURIComponent('out:json;responseHandler:' + cb)
        + '&sheet=' + encodeURIComponent(tab)
        + '&headers=1&_cb=' + Date.now();
    }
    // file:// 로 직접 열면 브라우저 Origin이 null이 되어 fetch가 CORS에 막히므로
    // <script> 태그 방식(JSONP)으로 읽는다 (script 태그에는 CORS가 적용되지 않음)
    function fetchTab(tab){
      return new Promise(function(resolve, reject){
        const cb = '__gviz_cb_' + Math.random().toString(36).slice(2);
        const script = document.createElement('script');
        const timer = setTimeout(function(){ cleanup(); reject(new Error(tab + ' 탭 읽기 시간 초과')); }, 25000);
        function cleanup(){ clearTimeout(timer); try{ delete window[cb]; }catch(e){ window[cb] = undefined; } if(script.parentNode) script.parentNode.removeChild(script); }
        window[cb] = function(resp){
          try{
            if(!resp || resp.status === 'error'){
              const m = resp && resp.errors && resp.errors[0] && (resp.errors[0].detailed_message || resp.errors[0].message);
              reject(new Error(tab + ' 탭 읽기 실패' + (m ? ' (' + m + ')' : '')));
              return;
            }
            const labels = (resp.table.cols || []).map(function(c){ return c.label || ''; });
            const rows = (resp.table.rows || []).map(function(r){
              const o = {};
              labels.forEach(function(h, i){
                const cell = r.c[i];
                o[h] = cell ? (cell.v == null ? '' : String(cell.v)) : '';
              });
              return o;
            }).filter(function(o){ return labels.some(function(h){ return String(o[h] || '').trim() !== ''; }); });
            resolve(rows);
          }catch(e){ reject(e); }
          finally{ cleanup(); }
        };
        script.onerror = function(){ cleanup(); reject(new Error(tab + ' 탭 읽기 실패 (네트워크)')); };
        script.src = gvizUrl(tab, cb);
        document.head.appendChild(script);
      });
    }

    function sheetVal(rows, key){
      const r = rows.find(function(x){ return x['항목'] === key; });
      return r ? r['값'] : '';
    }

    function buildDashboardData(S){
      const PILLAR_CLASS = ['p-external', 'p-internal', 'p-culture'];
      return {
        vision: sheetVal(S['설정'], '비전'),
        tfInfo: {
          title: sheetVal(S['설정'], '대시보드_제목'),
          purpose: sheetVal(S['설정'], 'TF_목적'),
          structure: sheetVal(S['설정'], 'TF_조직구조'),
          members: sheetVal(S['설정'], 'TF_구성원'),
          period: sheetVal(S['설정'], 'TF_운영기간'),
          history: S['연혁'].map(function(r){ return { date: r['날짜'], event: r['내용'] }; })
        },
        kpis: S['KPI'].map(function(r){ return { title: r['지표명'], value: r['수치'], unit: r['단위'], desc: r['설명'] }; }),
        pillars: S['3대전략'].map(function(r, i){
          return { title: r['전략명'], icon: r['아이콘'], class: PILLAR_CLASS[i] || 'p-external', desc: r['설명'],
                   details: [r['세부1'], r['세부2'], r['세부3']].filter(function(x){ return String(x || '').trim() !== ''; }) };
        }),
        ecosystemFlow: { steps: S['선순환체계'].map(function(r){ return { phase: r['단계'], title: r['제목'], desc: r['설명'] }; }) },
        roadmap: S['로드맵'].map(function(r){
          return { year: r['연도'], phase: r['단계'], goal: r['목표'],
                   tasks: { external: r['외부기술협업'], internal: r['내부기반'], culture: r['문화확산'], performance: r['성과관리'] } };
        }),
        academicPartnerships: S['대학파트너십'].map(function(r){ return { univ: r['대학'], fields: r['주요연구_협력분야'] }; }),
        openLab: {
          process: S['오픈랩_절차'].map(function(r){ return { step: r['단계'], desc: r['설명'] }; }),
          selectedProjects: S['오픈랩_선정과제'].map(function(r){ return { name: r['과제명'], method: r['추진방식'], site: r['실증장소'] }; }),
          support: S['오픈랩_지원사항'].map(function(r){ return r['지원내용']; })
        },
        aiVerificationGuide: S['실증운영체계'].map(function(r){ return { category: r['구분'], content: r['가이드라인'] }; }),
        ethicsPrinciples: S['윤리원칙'].map(function(r){ return { category: r['관점'], title: r['원칙명'], desc: r['설명'] }; }),
        governanceCompliance: {
          aiAct: S['AI기본법'].map(function(r){ return { duty: r['의무사항'], target: r['적용범위'], content: r['내용'] }; }),
          privacyAct: {
            title: sheetVal(S['설정'], '개인정보보호법_제목'),
            rights: S['개인정보보호법'].map(function(r){ return { name: r['권리명'], desc: r['내용'] }; })
          },
          complianceProcess: S['투명성이행절차'].map(function(r){ return { step: r['단계'], desc: r['설명'] }; })
        },
        cultureCampaign: S['문화확산'].map(function(r){ return { title: r['제목'], desc: r['설명'] }; }),
        stakeholders: S['외부거버넌스'].map(function(r){ return { category: r['구분'], name: r['기관명'], desc: r['역할'] }; }),
        educationProgress: S['교육현황'].map(function(r){
          return { course: r['과정명'], date: r['교육일자'], target: r['교육대상'], limit: r['정원'], participants: r['공단참여'], status: r['상태'] };
        })
      };
    }

    function setLiveStatus(mode, text){
      const dot = document.getElementById('live-dot');
      const label = document.getElementById('live-status');
      if(dot){ dot.className = 'live-dot ' + mode; }
      if(label){ label.textContent = text; }
    }

    async function loadDashboard(isRefresh){
      setLiveStatus('loading', isRefresh ? '시트에서 다시 불러오는 중...' : '시트에서 불러오는 중...');
      const loading = document.getElementById('loading-overlay');
      if(loading) loading.style.display = 'flex';
      const errBox = document.getElementById('error-box');
      if(errBox) errBox.style.display = 'none';
      try{
        const results = await Promise.all(SHEET_TABS.map(function(t){ return fetchTab(t); }));
        const S = {};
        SHEET_TABS.forEach(function(t, i){ S[t] = results[i]; });
        DASHBOARD_DATA = buildDashboardData(S);
        renderDashboard();
        if(loading) loading.style.display = 'none';
        const upd = sheetVal(S['설정'], '업데이트_기준일');
        const ver = sheetVal(S['설정'], '버전');
        setLiveStatus('ok', '시트 연동 중' + (upd ? ' · ' + upd + ' 기준' : '') + (ver ? ' · ' + ver : ''));
      }catch(e){
        if(loading) loading.style.display = 'none';
        setLiveStatus('error', '불러오기 실패');
        if(errBox){
          errBox.style.display = 'block';
          const msg = document.getElementById('error-msg');
          if(msg) msg.textContent = e.message || '데이터를 불러오지 못했습니다';
        }
        console.error(e);
      }
    }

    function refreshDashboard(){ loadDashboard(true); }
    // =================================================================================
    // 렌더링 엔진 (Vanilla Javascript로 DASHBOARD_DATA를 파싱해 HTML을 채움)
    // =================================================================================
    
    function renderDashboard() {
      // 1. Header 렌더링
      const headerContainer = document.getElementById('header-container');
      headerContainer.innerHTML = `
        <div class="brand-area">
          <span class="badge">Strategy Planning Partner</span>
          <h1 class="brand-title">${DASHBOARD_DATA.tfInfo.title}</h1>
        </div>
        <div class="vision-box">
          <span class="vision-label">Vision</span>
          <span class="vision-text">${DASHBOARD_DATA.vision}</span>
        </div>
      `;

      // 2. KPI 렌더링
      const kpiContainer = document.getElementById('kpi-container');
      kpiContainer.innerHTML = DASHBOARD_DATA.kpis.map(kpi => `
        <div class="glass-card kpi-card">
          <span class="kpi-title">${kpi.title}</span>
          <div class="kpi-value-container">
            <span class="kpi-value">${kpi.value}</span>
            <span class="kpi-unit">${kpi.unit}</span>
          </div>
          <p class="kpi-desc">${kpi.desc}</p>
        </div>
      `).join('');

      // 3. TF 요약 정보 렌더링
      const tfSummaryContainer = document.getElementById('tf-summary-container');
      tfSummaryContainer.innerHTML = `
        <div>
          <h3 class="tf-summary-title">🏛️ ${DASHBOARD_DATA.tfInfo.title}</h3>
          <ul class="tf-info-list">
            <li class="tf-info-item">
              <span class="tf-info-label">설립 목적</span>
              <span class="tf-info-val">${DASHBOARD_DATA.tfInfo.purpose}</span>
            </li>
            <li class="tf-info-item">
              <span class="tf-info-label">조직 구성</span>
              <span class="tf-info-val">${DASHBOARD_DATA.tfInfo.structure}</span>
            </li>
            <li class="tf-info-item">
              <span class="tf-info-label">운영 인력</span>
              <span class="tf-info-val">${DASHBOARD_DATA.tfInfo.members}</span>
            </li>
            <li class="tf-info-item">
              <span class="tf-info-label">운영 기간</span>
              <span class="tf-info-val">${DASHBOARD_DATA.tfInfo.period}</span>
            </li>
          </ul>
        </div>
        <div style="margin-top: 1.5rem; border-top: 2px solid #cbd5e1; padding-top: 1rem;">
          <span style="font-size:0.75rem; font-weight:800; color:var(--text-dark); text-transform:uppercase; letter-spacing:1.2px; display:block; margin-bottom:0.5rem;">추진 경과</span>
          <div style="display:flex; flex-direction:column; gap:0.4rem; max-height: 120px; overflow-y: auto; padding-right:0.3rem;">
            ${DASHBOARD_DATA.tfInfo.history.map(h => `
              <div style="display:flex; font-size:0.8rem; gap:0.6rem;">
                <span style="color:var(--primary); font-weight:800; min-width:55px;">${h.date}</span>
                <span style="color:var(--text-muted);">${h.event}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // 4. 선순환 실행체계 흐름 렌더링
      const ecosystemContainer = document.getElementById('ecosystem-container');
      ecosystemContainer.innerHTML = DASHBOARD_DATA.ecosystemFlow.steps.map(step => `
        <div class="ecosystem-step-card">
          <span class="step-badge">${step.phase}</span>
          <h4 class="step-title">${step.title}</h4>
          <p class="step-desc">${step.desc}</p>
        </div>
      `).join('');

      // 5. 3대 전략 체계 기둥 렌더링
      const strategyPillarsContainer = document.getElementById('strategy-pillars-container');
      strategyPillarsContainer.innerHTML = DASHBOARD_DATA.pillars.map(pillar => `
        <div class="glass-card pillar-card ${pillar.class}">
          <div>
            <div class="pillar-header">
              <div class="pillar-icon">${pillar.icon}</div>
              <h4 class="pillar-title">${pillar.title}</h4>
            </div>
            <p class="pillar-desc">${pillar.desc}</p>
          </div>
          <div>
            <span class="pillar-items-title">주요 실행 과제</span>
            <ul class="pillar-list">
              ${pillar.details.map(detail => `
                <li class="pillar-item">${detail}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `).join('');

      // 6. 중장기 로드맵 타임라인 렌더링
      const roadmapContainer = document.getElementById('roadmap-timeline-container');
      roadmapContainer.innerHTML = DASHBOARD_DATA.roadmap.map(node => `
        <div class="roadmap-node">
          <div class="roadmap-marker"></div>
          <div class="roadmap-time-label">
            <span class="time-year">${node.year}</span>
            <span class="time-phase">${node.phase}</span>
          </div>
          <div class="roadmap-body">
            <h4 class="roadmap-goal">${node.goal}</h4>
            <div class="roadmap-tasks-grid">
              <div class="roadmap-task-box">
                <span class="task-box-title">외부 협업</span>
                <p class="task-box-desc">${node.tasks.external}</p>
              </div>
              <div class="roadmap-task-box">
                <span class="task-box-title">내부 거버넌스</span>
                <p class="task-box-desc">${node.tasks.internal}</p>
              </div>
              <div class="roadmap-task-box">
                <span class="task-box-title">문화 확산</span>
                <p class="task-box-desc">${node.tasks.culture}</p>
              </div>
              <div class="roadmap-task-box">
                <span class="task-box-title">성과 관리</span>
                <p class="task-box-desc">${node.tasks.performance}</p>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      // 7. 오픈랩 운영 절차 및 지원사항 렌더링
      const openlabProcessContainer = document.getElementById('openlab-process-container');
      openlabProcessContainer.innerHTML = DASHBOARD_DATA.openLab.process.map((p, idx) => `
        <div style="display:flex; gap:0.8rem; background:#ffffff; border:1px solid #e2e8f0; padding:0.8rem; border-radius:6px; align-items:center;">
          <span style="font-size:1.1rem; font-weight:900; color:var(--accent-1); min-width:25px;">0${idx+1}</span>
          <div>
            <strong style="font-size:0.88rem; display:block; color:var(--text-main);">${p.step}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted);">${p.desc}</span>
          </div>
        </div>
      `).join('');

      const openlabSelectedContainer = document.getElementById('openlab-selected-container');
      if (openlabSelectedContainer && DASHBOARD_DATA.openLab.selectedProjects) {
        openlabSelectedContainer.innerHTML = DASHBOARD_DATA.openLab.selectedProjects.map((proj, idx) => `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid var(--secondary); padding:0.9rem; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
              <strong style="font-size:0.88rem; color:#166534;">[선정과제 0${idx+1}] ${proj.name}</strong>
              <span style="font-size:0.75rem; font-weight:700; background:#dcfce7; color:#15803d; padding:0.15rem 0.5rem; border-radius:4px;">${proj.site}</span>
            </div>
            <p style="font-size:0.82rem; color:#14532d; margin:0;">• 실증방식 및 내용: ${proj.method}</p>
          </div>
        `).join('');
      }

      const openlabSupportContainer = document.getElementById('openlab-support-container');
      openlabSupportContainer.innerHTML = DASHBOARD_DATA.openLab.support.map(s => {
        const isNote = s.startsWith('※');
        const color = isNote ? 'var(--text-dark)' : 'var(--text-muted)';
        const style = isNote ? 'font-style:italic; font-size:0.78rem;' : 'font-size:0.83rem;';
        return `
          <li style="display:flex; gap:0.5rem; ${style} color:${color}; line-height:1.4; margin-bottom:0.4rem;">
            <span>${isNote ? '•' : '✓'}</span>
            <span>${s}</span>
          </li>
        `;
      }).join('');

      // 8. 대학 직접 파트너십 렌더링
      const univContainer = document.getElementById('univ-partnerships-container');
      univContainer.innerHTML = DASHBOARD_DATA.academicPartnerships.map(univ => `
        <div class="univ-card">
          <span class="univ-name">${univ.univ}</span>
          <span class="univ-fields">${univ.fields}</span>
        </div>
      `).join('');

      // 9. AI 윤리 7대 원칙 렌더링
      const ethicsContainer = document.getElementById('ethics-container');
      ethicsContainer.innerHTML = DASHBOARD_DATA.ethicsPrinciples.map(rule => `
        <div class="ethics-card">
          <span class="ethics-tag">${rule.category}</span>
          <h4 class="ethics-title">${rule.title}</h4>
          <p class="ethics-desc">${rule.desc}</p>
        </div>
      `).join('');

      // 10. AI법 및 개인정보보호법 렌더링
      const lawActContainer = document.getElementById('law-act-container');
      lawActContainer.innerHTML = DASHBOARD_DATA.governanceCompliance.aiAct.map(act => `
        <tr>
          <td style="font-weight:800; color:var(--primary);">${act.duty}</td>
          <td style="color:var(--text-muted);">${act.target}</td>
          <td>${act.content}</td>
        </tr>
      `).join('');

      const privacyTitleContainer = document.getElementById('privacy-title-container');
      privacyTitleContainer.innerText = DASHBOARD_DATA.governanceCompliance.privacyAct.title;

      const privacyActContainer = document.getElementById('privacy-act-container');
      privacyActContainer.innerHTML = DASHBOARD_DATA.governanceCompliance.privacyAct.rights.map(r => `
        <tr>
          <td style="font-weight:800; color:var(--accent-2); width:130px;">${r.name}</td>
          <td>${r.desc}</td>
        </tr>
      `).join('');

      // 11. 거버넌스 단계별 절차 렌더링
      const complianceProcessContainer = document.getElementById('compliance-process-container');
      complianceProcessContainer.innerHTML = DASHBOARD_DATA.governanceCompliance.complianceProcess.map((proc, idx) => `
        <div class="compliance-box">
          <div class="compliance-step">STAGE 0${idx+1}</div>
          <h4 class="compliance-title">${proc.step}</h4>
          <p class="compliance-desc">${proc.desc}</p>
        </div>
      `).join('');

      // 12. 문화 확산 콘텐츠 렌더링
      const cultureCampaignsContainer = document.getElementById('culture-campaigns-container');
      cultureCampaignsContainer.innerHTML = DASHBOARD_DATA.cultureCampaign.map(camp => `
        <div class="culture-card">
          <div class="culture-card-header">
            <h4 class="culture-card-title">${camp.title}</h4>
          </div>
          <p class="culture-card-desc">${camp.desc}</p>
        </div>
      `).join('');

      // 13. 유관기관 매핑 테이블 렌더링
      const stakeholdersContainer = document.getElementById('stakeholders-container');
      stakeholdersContainer.innerHTML = DASHBOARD_DATA.stakeholders.map(s => `
        <tr>
          <td style="font-weight:800; color:var(--accent-3);">${s.category}</td>
          <td style="font-weight:800; color:var(--text-main);">${s.name}</td>
          <td style="color:var(--text-muted);">${s.desc}</td>
        </tr>
      `).join('');

      // 14. 행안부 공공 AI역량 교육과정 진행 현황 렌더링 (추가)
      const educationContainer = document.getElementById('education-container');
      educationContainer.innerHTML = DASHBOARD_DATA.educationProgress.map(edu => {
        let statusBadge = '';
        if (edu.status.includes('완료')) {
          statusBadge = `<span style="background: rgba(13, 148, 136, 0.08); border: 1px solid rgba(13, 148, 136, 0.25); color: var(--accent-1); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">${edu.status}</span>`;
        } else {
          statusBadge = `<span style="background: rgba(217, 119, 6, 0.08); border: 1px solid rgba(217, 119, 6, 0.25); color: var(--accent-3); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">${edu.status}</span>`;
        }
        return `
          <tr>
            <td style="font-weight:800; color:var(--text-main);">${edu.course}</td>
            <td style="color:var(--text-muted);">${edu.date}</td>
            <td style="color:var(--text-muted);">${edu.target}</td>
            <td style="color:var(--text-muted);">${edu.limit}</td>
            <td style="font-weight:700; color:var(--primary);">${edu.participants}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join('');

      // 15. AI 실증협업 가이드 렌더링 (추가)
      const guideContainer = document.getElementById('verification-guide-container');
      guideContainer.innerHTML = DASHBOARD_DATA.aiVerificationGuide.map(g => `
        <tr>
          <td style="font-weight:800; color:var(--primary); padding: 0.5rem 0.8rem;">${g.category}</td>
          <td style="color:var(--text-muted); padding: 0.5rem 0.8rem;">${g.content}</td>
        </tr>
      `).join('');
    }

    // =================================================================================
    // 탭 듀얼 제어 함수 (Tab switching logic)
    // =================================================================================
    function switchTab(tabId) {
      // 모든 탭 컨텐츠 숨기기
      const contents = document.querySelectorAll('.tab-content');
      contents.forEach(content => content.classList.remove('active'));

      // 모든 탭 버튼 비활성화
      const buttons = document.querySelectorAll('.tab-btn');
      buttons.forEach(btn => btn.classList.remove('active'));

      // 선택된 탭 활성화
      document.getElementById(tabId).classList.add('active');

      // 클릭한 버튼 활성화
      const clickedBtn = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(tabId));
      if (clickedBtn) {
        clickedBtn.classList.add('active');
      }
    }

    // 초기 실행: 시트에서 데이터를 읽어 렌더링
    window.addEventListener('DOMContentLoaded', () => {
      const link = document.getElementById('sheet-open-link');
      if(link) link.href = SHEET_URL;
      loadDashboard(false);
    });
  
// Embedded university collaboration dashboard v2 (single-file package)
    
    function openUniversityDashboard(event) {
      if (event) event.preventDefault();
      try {
        const binary = atob(UNIVERSITY_DASHBOARD_V2_B64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (!w) window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (e) {
        console.error('대학협력 대시보드 열기 실패:', e);
        alert('대학협력 대시보드를 열 수 없습니다.');
      }
    }
