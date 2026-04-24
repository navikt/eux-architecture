(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,815387,e=>{"use strict";var t=e.i(843476);e.i(874215);var a=e.i(753258);e.i(57042);var s=e.i(384451),r=e.i(557996);e.s(["default",0,({paths:e,currentPage:l})=>{let n=e=>e.length>40?e.substring(0,40)+"...":e;return(0,t.jsxs)("div",{className:"flex gap-1 items-center my-6",children:[(0,t.jsxs)(r.Link,{href:"/",className:"gap-1 flex  break-all",children:["Forsiden ",(0,t.jsx)(a.ChevronRightIcon,{"aria-label":"Inneholder","aria-hidden":!0})]}),e?.map(e=>(0,t.jsxs)(r.Link,{href:e.href,className:"gap-1 flex break-all",children:[n(e.pathName)," ",(0,t.jsx)(a.ChevronRightIcon,{"aria-label":"Inneholder","aria-hidden":!0})]},`breadcrumb_link_${n(e.pathName)}`)),l&&(0,t.jsx)(s.BodyShort,{children:n(l)})]})}])},883601,e=>{"use strict";var t=e.i(843476),a=e.i(815387),s=e.i(290154);e.s(["PageLayout",0,({children:e,pageTitle:r,fullWidth:l,noPadding:n,currentPage:i,breadcrumbPaths:d})=>(0,t.jsx)("div",{id:"content",role:"main",className:`flex flex-col w-full bg-white ${l?"":"max-w-7xl"}`,children:(0,t.jsxs)("div",{className:`${n?"":"px-2 pb-6"}`,children:[(i||d)&&(0,t.jsx)(a.default,{currentPage:i,paths:d}),r&&(0,t.jsxs)(s.Helmet,{children:[(0,t.jsx)("meta",{charSet:"utf-8"}),(0,t.jsx)("title",{children:r})]}),e]})})])},535192,e=>{"use strict";var t=e.i(330559);e.s(["TextField",()=>t.default])},25389,e=>{"use strict";var t=e.i(962216);e.s(["InformationSquareIcon",()=>t.default])},737032,e=>{"use strict";var t=e.i(787261);e.s(["Alert",()=>t.default])},967486,e=>{"use strict";var t=e.i(620699);e.s(["Textarea",()=>t.default])},862354,e=>{"use strict";var t=e.i(667929);e.s(["ToggleGroup",()=>t.default])},678049,e=>{"use strict";var t=e.i(843476),a=e.i(812497);e.s(["Error",0,({message:e,noBulletPoint:a})=>(0,t.jsx)("div",{className:"navds-form-field__error pt-2",id:"textField-error-rm","aria-relevant":"additions removals","aria-live":"polite",children:(0,t.jsxs)("p",{className:"navds-error-message navds-label flex gap-2",children:[!a&&(0,t.jsx)("span",{children:"•"}),e]})}),"FormError",0,({fieldName:e,akselStyling:s})=>(0,t.jsxs)(t.Fragment,{children:[!s&&(0,t.jsx)(a.ErrorMessage,{name:e,children:e=>e}),s&&(0,t.jsx)("div",{className:"navds-form-field__error pt-2",id:"textField-error-rm","aria-relevant":"additions removals","aria-live":"polite",children:(0,t.jsx)(a.ErrorMessage,{name:e,children:e=>(0,t.jsxs)("p",{className:"navds-error-message navds-label flex gap-2",children:[(0,t.jsx)("span",{children:"•"}),e]})})})]})])},257929,e=>{"use strict";var t=e.i(979541),a=e.i(825306),s=e.i(790669),r=e.i(581949),l=e.i(271645);let n=async e=>(await r.default.get(`${a.env.backendBaseUrl}/team/resource/${e}`)).data,i=async e=>(await r.default.get(`${a.env.backendBaseUrl}/team/resource/search/${e}`)).data.content,d=async e=>{if(e&&e.length>2){let t=await i(e);if(t&&t.length)return t.map(e=>({value:e.navIdent,label:e.fullName,...e}))}return[]},o=async e=>{let t=(await r.default.get(`${a.env.backendBaseUrl}/team/${e}`)).data;return t.members=t.members.sort((e,t)=>(e.name||"").localeCompare(t.name||"")),t},u=async()=>(await r.default.get(`${a.env.backendBaseUrl}/team`)).data.content,m=async()=>(await r.default.get(`${a.env.backendBaseUrl}/team?myTeams=true`)).data.content,v=async()=>(await r.default.get(`${a.env.backendBaseUrl}/team/productarea?myProductAreas=true`)).data.content,c=async e=>(await r.default.get(`${a.env.backendBaseUrl}/team/search/${e}`)).data.content,k=async e=>(await r.default.get(`${a.env.backendBaseUrl}/team/slack/channel/${e}`)).data,g=async e=>(await r.default.get(`${a.env.backendBaseUrl}/team/slack/user/email/${e}`)).data,E=async e=>(await r.default.get(`${a.env.backendBaseUrl}/team/slack/user/id/${e}`)).data,h=async e=>(await r.default.get(`${a.env.backendBaseUrl}/team/slack/channel/search/${e}`)).data.content,f=new Map,D=new Map,p=new Map,S=new Map,j=async e=>{if(e&&e.length>2){let t=await c(e);if(t&&t.length)return t.map(e=>({value:e.id,label:e.name,...e}))}return[]},N=async e=>e&&e.replace(/ /g,"").length>2?(await i(e)).map(e=>({value:e.navIdent,label:e.fullName,...e})):[],I=async e=>e&&e.replace(/ /g,"").length>2?(await h(e)).map(e=>({value:e.id,label:e.name,...e})):[];e.s(["getSlackChannelById",0,k,"getSlackUserByEmail",0,g,"getSlackUserById",0,E,"searchResourceByNameOptions",0,d,"useMyTeams",0,()=>{let e=(0,l.useContext)(t.UserContext).getIdent(),[a]=(()=>{let e=(0,l.useContext)(t.UserContext).getIdent(),[a,s]=(0,l.useState)([]),[r,n]=(0,l.useState)(!!e);return(0,l.useEffect)(()=>{e&&v().then(e=>{s(e),n(!1)}).catch(e=>{s([]),n(!1),console.error("couldn	 find product area",e)})},[e]),[a,r]})(),[s,r]=(0,l.useState)([]),[n,i]=(0,l.useState)(!!e);return(0,l.useEffect)(()=>{e&&m().then(e=>{0===e.length?u().then(e=>{let t=a.map(t=>e.filter(e=>t.id===e.productAreaId)).flat(),s=new Set;r(t.filter(e=>{let t=s.has(e.name);return s.add(e.name),!t}))}):r(e),i(!1)}).catch(e=>{r([]),i(!1),console.error("couldn't find teams",e)})},[e,a]),[s,n]},"usePersonName",0,()=>{let e=(0,s.useForceUpdate)();return t=>{!f.get(t)?.f&&(f.has(t)||n(t).then(e=>{f.set(e.navIdent,{f:!0,v:e.fullName}),p.get(e.navIdent)?.forEach(e=>e()),p.delete(e.navIdent)}).catch(e=>console.error("err fetching person",e)),f.has(t)||f.set(t,{f:!1,v:t}),p.has(t)?p.set(t,[...p.get(t),e]):p.set(t,[e]));return f.get(t)?.v||t}},"usePersonSearch",0,N,"useSearchTeamOptions",0,j,"useSlackChannelSearch",0,I,"useTeam",0,()=>{let e=(0,s.useForceUpdate)();return t=>{!D.get(t)?.f&&(D.has(t)||o(t).then(e=>{D.set(e.id,{f:!0,v:e}),S.get(e.id)?.forEach(e=>e()),S.delete(e.id)}).catch(e=>console.error("err fetching team",e)),D.has(t)||D.set(t,{f:!1,v:{id:t,name:t,description:"",members:[],tags:[]}}),S.has(t)?S.set(t,[...S.get(t),e]):S.set(t,[e]));let a=D.get(t)?.v;return[a?.name||t,a]}}])},377272,e=>{"use strict";var t,a=((t={}).EPOST="EPOST",t.SLACK="SLACK",t.SLACK_USER="SLACK_USER",t);e.s(["EAdresseType",()=>a])},578820,e=>{"use strict";var t=e.i(696711);e.s(["Tabs",()=>t.default])},899070,e=>{"use strict";var t=e.i(100529);e.s(["Accordion",()=>t.default])},626942,e=>{"use strict";var t=e.i(887463);e.s(["Box",()=>t.default])},137779,e=>{"use strict";var t=e.i(889688);e.s(["Tag",()=>t.default])},251731,e=>{"use strict";var t=e.i(7235);e.s(["LinkPanel",()=>t.default])},485790,e=>{"use strict";var t=e.i(239382);e.s(["Skeleton",()=>t.default])},544120,e=>{"use strict";var t=e.i(843476),a=e.i(141838);e.i(57042);var s=e.i(933302),r=e.i(485790),l=e.i(642778);let n=e=>{let{count:a}=e;return(0,t.jsx)("div",{children:l.range(a).map(e=>(0,t.jsx)("div",{className:"mb-1.5",children:(0,t.jsx)(r.Skeleton,{variant:"rectangle",width:"100%",height:"5.125rem"})},e))})};e.s(["LoadingSkeleton",0,e=>{let{header:l}=e;return(0,t.jsxs)("div",{className:"w-full",children:[(0,t.jsxs)("div",{className:"flex justify-between items-center w-full",children:[(0,t.jsxs)(a.ContentLayout,{children:[(0,t.jsx)(s.Heading,{level:"1",size:"medium",className:"mr-2.5",children:l}),(0,t.jsx)(r.Skeleton,{height:"2.5rem",width:"25rem"})]}),(0,t.jsxs)("div",{className:"flex",children:[(0,t.jsx)(r.Skeleton,{height:"2.5rem",width:"2.5rem",className:"mr-2.5"}),(0,t.jsx)(r.Skeleton,{height:"2.5rem",width:"2.5rem"})]})]}),(0,t.jsx)("div",{className:"max-w-xl",children:(0,t.jsx)(n,{count:12})})]})},"SkeletonPanel",0,n])},900376,e=>{"use strict";var t=e.i(115769);e.s(["Dialog",()=>t.default])},268974,e=>{"use strict";var t=e.i(702807);let a=t.gql`
  query getEtterlevelseDokumentasjoner(
    $pageNumber: NonNegativeInt
    $pageSize: NonNegativeInt
    $mineEtterlevelseDokumentasjoner: Boolean
    $sistRedigert: NonNegativeInt
    $sok: String
    $behandlingId: String
  ) {
    etterlevelseDokumentasjoner: etterlevelseDokumentasjon(
      filter: {
        mineEtterlevelseDokumentasjoner: $mineEtterlevelseDokumentasjoner
        sistRedigert: $sistRedigert
        sok: $sok
        behandlingId: $behandlingId
      }
      pageNumber: $pageNumber
      pageSize: $pageSize
    ) {
      pageNumber
      pageSize
      pages
      numberOfElements
      totalElements
      content {
        id
        title
        etterlevelseNummer
        etterlevelseDokumentVersjon
        sistEndretEtterlevelse
        sistEndretEtterlevelseAvMeg
        sistEndretDokumentasjonAvMeg
        changeStamp {
          createdDate
        }
        teamsData {
          id
          name
        }
      }
    }
  }
`,s=t.gql`
  query getEtterlevelseDokumentasjoner(
    $pageNumber: NonNegativeInt
    $pageSize: NonNegativeInt
    $mineEtterlevelseDokumentasjoner: Boolean
    $sistRedigert: NonNegativeInt
    $sok: String
    $behandlingId: String
  ) {
    etterlevelseDokumentasjoner: etterlevelseDokumentasjon(
      filter: {
        mineEtterlevelseDokumentasjoner: $mineEtterlevelseDokumentasjoner
        sistRedigert: $sistRedigert
        sok: $sok
        behandlingId: $behandlingId
      }
      pageNumber: $pageNumber
      pageSize: $pageSize
    ) {
      pageNumber
      pageSize
      pages
      numberOfElements
      totalElements
      content {
        id
        title
        etterlevelseNummer
        sistEndretEtterlevelse
        prioritertKravNummer
        teamsData {
          id
          name
        }
        behandlinger {
          id
          navn
          nummer
        }
      }
    }
  }
`,r=t.gql`
  query getEtterlevelseDokumentasjonStats($etterlevelseDokumentasjonId: ID) {
    etterlevelseDokumentasjon(filter: { id: $etterlevelseDokumentasjonId }) {
      content {
        stats {
          relevantKrav {
            kravNummer
            kravVersjon
            navn
            status
            aktivertDato
            tagger
            etterlevelser(
              onlyForEtterlevelseDokumentasjon: true
              etterlevelseDokumentasjonId: $etterlevelseDokumentasjonId
            ) {
              status
              id
              etterlevelseDokumentasjonId
              fristForFerdigstillelse
              suksesskriterieBegrunnelser {
                suksesskriterieStatus
              }
              changeStamp {
                lastModifiedBy
                lastModifiedDate
                createdDate
              }
            }
            regelverk {
              lov {
                code
                shortName
              }
            }
            changeStamp {
              lastModifiedBy
              lastModifiedDate
              createdDate
            }
          }
          irrelevantKrav {
            kravNummer
            kravVersjon
            navn
            status
            aktivertDato
            tagger
            etterlevelser(
              onlyForEtterlevelseDokumentasjon: true
              etterlevelseDokumentasjonId: $etterlevelseDokumentasjonId
            ) {
              id
              status
              etterlevelseDokumentasjonId
              fristForFerdigstillelse
              suksesskriterieBegrunnelser {
                suksesskriterieStatus
              }
              changeStamp {
                lastModifiedBy
                lastModifiedDate
                createdDate
              }
            }
            regelverk {
              lov {
                code
                shortName
              }
            }
            changeStamp {
              lastModifiedBy
              lastModifiedDate
              createdDate
            }
          }
          utgaattKrav {
            kravNummer
            kravVersjon
            navn
            status
            aktivertDato
            etterlevelser(
              onlyForEtterlevelseDokumentasjon: true
              etterlevelseDokumentasjonId: $etterlevelseDokumentasjonId
            ) {
              id
              behandlingId
              status
              etterlevelseDokumentasjonId
              suksesskriterieBegrunnelser {
                suksesskriterieStatus
              }
              changeStamp {
                lastModifiedBy
                lastModifiedDate
                createdDate
              }
            }
            regelverk {
              lov {
                code
                shortName
              }
            }
            changeStamp {
              lastModifiedBy
              lastModifiedDate
              createdDate
            }
          }
        }
      }
    }
  }
`;e.s(["getEtterlevelseDokumentasjonByBehandlingIdQuery",0,s,"getEtterlevelseDokumentasjonListQuery",0,a,"getEtterlevelseDokumentasjonStatsQuery",0,r])},434906,544659,e=>{"use strict";var t,a=((t={}).ARVER="ARVER",t.BYGGER="BYGGER",t.ENGANGSKOPI="ENGANGSKOPI",t);e.s(["ERelationType",()=>a],544659);var s=e.i(825306),r=e.i(581949);let l=async(e,t)=>(await r.default.get(`${s.env.backendBaseUrl}/documentrelation?pageNumber=${e}&pageSize=${t}`)).data,n=async(e,t)=>{let a=`${s.env.backendBaseUrl}/documentrelation/todocument/${e}`;return t&&(a+=`?relationType=${t}`),(await r.default.get(a)).data},i=async(e,t)=>{let a=`${s.env.backendBaseUrl}/documentrelation/todocument/${e}`;t&&(a+=`?relationType=${t}`);let l=a+(t?"&":"?")+"withDocumentData=true";return(await r.default.get(l)).data},d=async(e,t)=>{let a=`${s.env.backendBaseUrl}/documentrelation/fromdocument/${e}`;t&&(a+=`?relationType=${t}`);let l=a+(t?"&":"?")+"withDocumentData=true";return(await r.default.get(l)).data},o=async()=>{let e=await l(0,100);if(1===e.pages)return e.content.length>0?[...e.content]:[];{let t=[...e.content];for(let a=1;a<e.pages;a++)t=[...t,...(await l(a,100)).content];return t}},u=async e=>(await r.default.delete(`${s.env.backendBaseUrl}/documentrelation/${e}`)).data;e.s(["deleteDocumentRelation",0,u,"documentRelationMapToFormVal",0,e=>({id:e.id||"",changeStamp:e.changeStamp||{lastModifiedDate:"",lastModifiedBy:""},version:e.version||-1,fromDocument:e.fromDocument||"",toDocument:e.toDocument||"",RelationType:e.RelationType||a.ARVER}),"dokumentRelationTypeToString",0,e=>{switch(e){case a.ARVER:return"Arver fra";case a.BYGGER:return"Bygger fra";case a.ENGANGSKOPI:return"engangskopi fra"}},"getAllDocumentRelation",0,o,"getDocumentRelationByFromIdAndRelationTypeWithData",0,d,"getDocumentRelationByToIdAndRelationType",0,n,"getDocumentRelationByToIdAndRelationTypeWithData",0,i],434906)},208976,e=>{"use strict";var t,a,s=e.i(499683),r=((t={}).PAKREVD="Påkrevd minst 1 team eller 1 person",t),l=((a={}).TITLE="Etterlevelsesdokumentasjon trenger en tittel",a.BESKRIVELSE="Etterlevelsesdokumentasjon trenger en beskrivelse",a.VARSLINGSADRESSER="Påkrevd minst 1 varslingsadresse",a.TEAMDATA="Påkrevd minst 1 team eller 1 person",a.RESOURCEDATA="Påkrevd minst 1 team eller 1 person",a.NOM_AVDELING_ID="Dere må angi hvilken avdeling som er ansvarlig for etterlevelsen",a);let n=s.string().required("Etterlevelsesdokumentasjon trenger en tittel"),i=s.string().required("Etterlevelsesdokumentasjon trenger en beskrivelse"),d=s.array().test({name:"varslingsadresserCheck",message:"Påkrevd minst 1 varslingsadresse",test:function(e){return!!e&&e.length>0}}),o=s.array().test({name:"teamsDataCheck",message:"Påkrevd minst 1 team eller 1 person",test:function(e){let{parent:t}=this;return!!e&&e.length>0||!!t.resourcesData&&t.resourcesData.length>0}}),u=s.array().test({name:"resourcesDataCheck",message:"Påkrevd minst 1 team eller 1 person",test:function(e){let{parent:t}=this;return!!e&&e.length>0||!!t.teamsData&&t.teamsData.length>0}});e.s(["EEtterlevelseDokumentSchemaMelding",()=>l,"EPaKrevdMember",()=>r,"beskrivelseCheck",0,i,"etterlevelseDokumentasjonSchema",0,()=>s.object({title:n,beskrivelse:i,varslingsadresser:d,teamsData:o,resourcesData:u,nomAvdelingId:s.string().required("Dere må angi hvilken avdeling som er ansvarlig for etterlevelsen")}),"etterlevelseDokumentasjonWithRelationSchema",0,()=>s.object({title:n,varslingsadresser:d,relationType:s.string().required("Du må velge hvordan du ønsker å gjenbruke dette dokumentet"),teamsData:o,resourcesData:u,nomAvdelingId:s.string().required("Dere må angi hvilken avdeling som er ansvarlig for etterlevelsen")}),"resourcesDataCheck",0,u,"teamsDataCheck",0,o,"titleCheck",0,n,"varslingsadresserCheck",0,d])},731685,e=>{"use strict";var t=e.i(314742),a=e.i(825306),s=e.i(581949),r=e.i(271645);let l=async e=>(await s.default.get(`${a.env.backendBaseUrl}/etterlevelse/${e}`)).data,n=async(e,t)=>(await s.default.get(`${a.env.backendBaseUrl}/etterlevelse/kravnummer/${e}/${t}`)).data,i=async(e,t)=>(await s.default.get(`${a.env.backendBaseUrl}/etterlevelse/etterlevelseDokumentasjon/${e}/${t}`)).data,d=async e=>(await s.default.delete(`${a.env.backendBaseUrl}/etterlevelse/${e}`)).data,o=async e=>{let t=m(e);return(await s.default.post(`${a.env.backendBaseUrl}/etterlevelse`,t)).data},u=async e=>{let t=m(e);return(await s.default.put(`${a.env.backendBaseUrl}/etterlevelse/${e.id}`,t)).data};function m(e){let t={...e};return delete t.changeStamp,delete t.version,t}let v=(e,a)=>{let s=e.suksesskriterieBegrunnelser||[];return a&&(s.length?a.suksesskriterier.forEach(e=>{s.map(t=>(t.suksesskriterieId===e.id&&(t.behovForBegrunnelse=e.behovForBegrunnelse),t))}):a.suksesskriterier.forEach(e=>{s.push({suksesskriterieId:e.id,behovForBegrunnelse:e.behovForBegrunnelse,begrunnelse:"",suksesskriterieStatus:t.ESuksesskriterieStatus.UNDER_ARBEID,veiledning:!1,veiledningsTekst:"",veiledningsTekst2:""})})),{id:e.id||"",behandlingId:e.behandlingId||"",etterlevelseDokumentasjonId:e.etterlevelseDokumentasjonId||"",kravNummer:e.kravNummer||0,kravVersjon:e.kravVersjon||0,changeStamp:e.changeStamp||{lastModifiedDate:"",lastModifiedBy:""},suksesskriterieBegrunnelser:s,version:-1,etterleves:e.etterleves||!1,statusBegrunnelse:e.statusBegrunnelse||"",dokumentasjon:e.dokumentasjon||[],fristForFerdigstillelse:e.fristForFerdigstillelse||"",status:e.status||t.EEtterlevelseStatus.UNDER_REDIGERING}};e.s(["createEtterlevelse",0,o,"deleteEtterlevelse",0,d,"getEtterlevelserByEtterlevelseDokumentasjonIdKravNumber",0,i,"getEtterlevelserByKravNumberKravVersion",0,n,"mapEtterlevelseToFormValue",0,v,"updateEtterlevelse",0,u,"useEtterlevelse",0,(e,t,a)=>{let s="ny"===e,[n,i]=(0,r.useState)(s?v({behandlingId:t,kravVersjon:a?.kravVersjon,kravNummer:a?.kravNummer}):void 0);return(0,r.useEffect)(()=>{e&&!s&&l(e).then(i)},[e]),[n,i]}])},798061,e=>{"use strict";var t=e.i(314742),a=e.i(642778),s=e.i(166540),r=e.i(200327);let l=[{label:"Alle",id:"ALLE"},{label:"Oppfylt",id:t.ESuksesskriterieStatus.OPPFYLT},{label:"Ikke relevant",id:t.EEtterlevelseStatus.IKKE_RELEVANT_FERDIG_DOKUMENTERT},{label:"Ikke oppfylt",id:t.ESuksesskriterieStatus.IKKE_OPPFYLT}],n=e=>{let a=(e.etterlevelser||[]).filter(e=>e.status===t.EEtterlevelseStatus.FERDIG_DOKUMENTERT||e.status===t.EEtterlevelseStatus.IKKE_RELEVANT_FERDIG_DOKUMENTERT).sort((e,t)=>e.etterlevelseDokumentasjon&&t.etterlevelseDokumentasjon?e.etterlevelseDokumentasjon.title.localeCompare(t.etterlevelseDokumentasjon.title):-1).filter(e=>e.etterlevelseDokumentasjon&&"LEGACY_DATA"!==e.etterlevelseDokumentasjon.title);return a.map(e=>{if(e.etterlevelseDokumentasjon.teamsData&&0!==e.etterlevelseDokumentasjon.teamsData.length||(e.etterlevelseDokumentasjon.teamsData=[{id:"INGEN_TEAM",name:"Ingen team",description:"ingen",tags:[],members:[],productAreaId:"INGEN_PO",productAreaName:"Ingen produktområde"}]),e.etterlevelseDokumentasjon.teamsData)return e.etterlevelseDokumentasjon.teamsData.forEach(e=>{e.productAreaId||e.productAreaName||(e.productAreaId="INGEN_PO",e.productAreaName="Ingen produktområde")}),e}),a},i=(e,a)=>n(e).filter(e=>"ALLE"===a?e.status===t.EEtterlevelseStatus.FERDIG_DOKUMENTERT||e.status===t.EEtterlevelseStatus.IKKE_RELEVANT_FERDIG_DOKUMENTERT:a===t.EEtterlevelseStatus.IKKE_RELEVANT_FERDIG_DOKUMENTERT?e.status===t.EEtterlevelseStatus.IKKE_RELEVANT_FERDIG_DOKUMENTERT||e.suksesskriterieBegrunnelser.filter(e=>e.suksesskriterieStatus===t.ESuksesskriterieStatus.IKKE_RELEVANT).length>0:a===t.ESuksesskriterieStatus.IKKE_OPPFYLT?e.suksesskriterieBegrunnelser.filter(e=>e.suksesskriterieStatus===t.ESuksesskriterieStatus.IKKE_OPPFYLT).length>0:a===t.ESuksesskriterieStatus.OPPFYLT?e.suksesskriterieBegrunnelser.filter(e=>e.suksesskriterieStatus===t.ESuksesskriterieStatus.OPPFYLT).length>0:e.status===a);e.s(["etterlevelseFilter",0,l,"etterlevelseName",0,e=>`${(0,r.kravNummerView)(e.kravVersjon,e.kravNummer)}`,"etterlevelseTeamNavnId",0,e=>e.etterlevelseDokumentasjon.teamsData?e.etterlevelseDokumentasjon.teamsData.map(e=>e.name?e.name:e.id).join(", "):"Ingen team","etterlevelserSorted",0,n,"filteredEtterlevelseSorted",0,i,"getEtterlevelseStatus",0,(e,a)=>{switch(e){case t.EEtterlevelseStatus.UNDER_REDIGERING:case t.EEtterlevelseStatus.FERDIG:return"Etterlevelse under arbeid";case t.EEtterlevelseStatus.IKKE_RELEVANT:return"Ikke relevant";case t.EEtterlevelseStatus.IKKE_RELEVANT_FERDIG_DOKUMENTERT:case t.EEtterlevelseStatus.FERDIG_DOKUMENTERT:return"Ferdig utfylt etterlevelse";case t.EEtterlevelseStatus.OPPFYLLES_SENERE:if(a)return"Utsatt til "+(0,s.default)(a).format("LL");return"Utsatt";default:return""}},"getLabelForSuksessKriterie",0,e=>e===t.ESuksesskriterieStatus.UNDER_ARBEID?"Hva er oppfylt og hva er under arbeid?":e===t.ESuksesskriterieStatus.OPPFYLT?"Hvordan oppfylles kriteriet?":e===t.ESuksesskriterieStatus.IKKE_OPPFYLT?"Hvorfor er ikke kriteriet oppfylt?":"Hvorfor er ikke kriteriet relevant?","getStatusLabelColor",0,e=>{switch(e){case t.EEtterlevelseStatus.UNDER_REDIGERING:case t.EEtterlevelseStatus.FERDIG:return"info";case t.EEtterlevelseStatus.IKKE_RELEVANT:return"neutral";case t.EEtterlevelseStatus.IKKE_RELEVANT_FERDIG_DOKUMENTERT:case t.EEtterlevelseStatus.FERDIG_DOKUMENTERT:return"success";case t.EEtterlevelseStatus.OPPFYLLES_SENERE:return"warning";default:return"neutral"}},"getSuksesskriterieBegrunnelse",0,(e,t)=>{let a=e.find(e=>e.suksesskriterieId===t.id);return a||{suksesskriterieId:t.id,begrunnelse:"",behovForBegrunnelse:t.behovForBegrunnelse,suksesskriterieStatus:void 0,veiledning:!1,veiledningsTekst:"",veiledningsTekst2:""}},"produktOmradeSorted",0,(e,t)=>a.default.sortedUniqBy(i(e,t).map(e=>e.etterlevelseDokumentasjon.teamsData&&e.etterlevelseDokumentasjon.teamsData).flat().sort((e,t)=>(e?.productAreaName||"").localeCompare(t?.productAreaName||"")).filter(e=>!!e)||[],e=>e?.productAreaId),"syncEtterlevelseKriterieBegrunnelseWithKrav",0,(e,t)=>{let a=[];return t?.suksesskriterier.forEach(t=>{a.push(e.suksesskriterieBegrunnelser.filter(e=>e.suksesskriterieId===t.id)[0])}),a}])},60676,e=>{"use strict";var t=e.i(843476),a=e.i(653090),s=e.i(200327);e.i(57042);var r=e.i(2106),l=e.i(137779);e.s(["default",0,({status:e,variant:n,icon:i})=>{let d=a=>(0,t.jsx)(l.Tag,{variant:a,className:"h-fit",children:(0,t.jsxs)("div",{className:"flex items-center",children:[i,(0,t.jsx)(r.Detail,{className:"whitespace-nowrap",children:(0,s.kravStatus)(e)})]})});return n?d(n):e===a.EKravStatus.UTKAST?d("neutral"):e===a.EKravStatus.AKTIV?d("success"):e===a.EKravStatus.UTGAATT?d("error"):d("neutral")}])},826755,459664,e=>{"use strict";var t=e.i(843476),a=e.i(257929),s=e.i(377272),r=e.i(825306);let l="T5LNAMWNA",n=e=>`slack://channel?team=${l}&id=${e}`,i=e=>`slack://user?team=${l}&id=${e}`;e.s(["slackLink",0,n,"slackUserLink",0,i,"teamKatPersonLink",0,e=>`${r.env.teamKatBaseUrl}resource/${e}`,"teamKatTeamLink",0,e=>`${r.env.teamKatBaseUrl}team/${e}`,"termUrl",0,e=>`https://navno.sharepoint.com/sites/begreper/SitePages/Begrep.aspx?bid=${e}`],459664),e.i(57042);var d=e.i(629321),o=e.i(271645),u=e.i(741967);e.s(["VarslingsadresserView",0,({varslingsadresser:e})=>{let[r,l]=(0,o.useState)([]),[m,v]=(0,o.useState)([]);return(0,o.useEffect)(()=>{(async()=>{let t=[],n=[],i=await Promise.all(e.filter(e=>e.type===s.EAdresseType.SLACK).filter(e=>!r.find(t=>t.id===e.adresse)).filter(e=>!e.slackChannel||(t.push(e.slackChannel),!1)).map(e=>(0,a.getSlackChannelById)(e.adresse))),d=await Promise.all(e.filter(e=>e.type===s.EAdresseType.SLACK_USER).filter(e=>!m.find(t=>t.id===e.adresse)).filter(e=>!e.slackUser||(n.push(e.slackUser),!1)).map(e=>(0,a.getSlackUserById)(e.adresse)));l([...r,...i,...t]),v([...m,...d,...n])})()},[e]),(0,t.jsx)("div",{children:e.map((e,a)=>{if(e.type===s.EAdresseType.SLACK){let s=r.find(t=>t.id===e.adresse);return(0,t.jsxs)("div",{className:"flex items-center mb-2.5",children:[(0,t.jsx)(d.BodyLong,{size:"medium",className:"mr-1",children:"Slack:"}),(0,t.jsx)(u.ExternalLink,{className:"text-medium",href:n(e.adresse),children:`#${s?.name||e.adresse}`})]},"kravVarsling_list_SLACK_"+a)}if(e.type===s.EAdresseType.SLACK_USER){let s=m.find(t=>t.id===e.adresse);return(0,t.jsxs)("div",{className:"flex items-center mb-2.5",children:[(0,t.jsx)(d.BodyLong,{size:"medium",className:"mr-1",children:"Slack:"}),(0,t.jsx)(u.ExternalLink,{className:"text-medium",href:i(e.adresse),children:`${s?.name||e.adresse}`})]},"kravVarsling_list_SLACK_USER_"+a)}return(0,t.jsxs)("div",{className:"flex items-center mb-2.5",children:[(0,t.jsx)(d.BodyLong,{size:"medium",className:"mr-1",children:"Epost:"}),(0,t.jsx)(u.ExternalLink,{className:"text-medium",href:`mailto:${e.adresse}`,openOnSamePage:!0,children:e.adresse})]},"kravVarsling_list_EMAIL_"+a)})})}],826755)},187928,e=>{"use strict";var t=e.i(825306),a=e.i(581949);let s=async(e,s,r)=>(await a.default.get(`${t.env.backendBaseUrl}/etterlevelsemetadata/etterlevelseDokumentasjon/${e}/${s}/${r}`)).data,r=async e=>{let s=n(e);return(await a.default.post(`${t.env.backendBaseUrl}/etterlevelsemetadata`,s)).data},l=async e=>{let s=n(e);return(await a.default.put(`${t.env.backendBaseUrl}/etterlevelsemetadata/${e.id}`,s)).data};function n(e){let t={...e};return delete t.changeStamp,delete t.version,t}e.s(["createEtterlevelseMetadata",0,r,"getEtterlevelseMetadataByEtterlevelseDokumentasjonAndKravNummerAndKravVersion",0,s,"mapEtterlevelseMetadataToFormValue",0,e=>({id:e.id||"",etterlevelseDokumentasjonId:e.etterlevelseDokumentasjonId||"",behandlingId:e.behandlingId||"",kravNummer:e.kravNummer||0,kravVersjon:e.kravVersjon||0,tildeltMed:e.tildeltMed||[],notater:e.notater||"",changeStamp:e.changeStamp||{lastModifiedDate:"",lastModifiedBy:""},version:-1}),"updateEtterlevelseMetadata",0,l])},587825,e=>{"use strict";var t=e.i(843476),a=e.i(731685),s=e.i(187928),r=e.i(60676),l=e.i(469112),n=e.i(470248),i=e.i(314742),d=e.i(653090),o=e.i(979541),u=e.i(78163),m=e.i(245953),v=e.i(798061);e.i(57042);var c=e.i(384451),k=e.i(2106),g=e.i(251731),E=e.i(166540),h=e.i(657688),f=e.i(271645);let D=({warningMessage:e})=>(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)(h.default,{src:l.warningAlert,width:"18",height:"18",alt:"warning icon"}),(0,t.jsx)(k.Detail,{className:"whitespace-nowrap",children:e})]});e.s(["KravCard",0,e=>{let{noVarsling:l,krav:h,temaCode:p,etterlevelseDokumentasjonId:S,risikoscenarioList:j,allTiltak:N,previousVurdering:I}=e,y=(0,f.useContext)(o.UserContext),b=void 0===h.etterlevelseStatus,x=h.etterlevelseStatus===i.EEtterlevelseStatus.OPPFYLLES_SENERE,T=!l&&(b||x),[R,$]=(0,f.useState)(!1),A=(0,m.getNumberOfDaysBetween)(h.aktivertDato,new Date),[B,K]=(0,f.useState)(!1),w=j.filter(e=>e.relevanteKravNummer.filter(e=>e.kravNummer===h.kravNummer).length>0),U=!!h.tagger&&0!==h.tagger.length&&h.tagger.includes("Personvernkonsekvensvurdering"),L=w.length>0,[M,_]=(0,f.useState)((0,s.mapEtterlevelseMetadataToFormValue)({id:"ny",etterlevelseDokumentasjonId:S,kravNummer:h.kravNummer,kravVersjon:h.kravVersjon}));return(0,f.useEffect)(()=>{(async()=>{(0,s.getEtterlevelseMetadataByEtterlevelseDokumentasjonAndKravNummerAndKravVersion)(S,h.kravNummer,h.kravVersjon).then(e=>{e.content.length?_(e.content[0]):_((0,s.mapEtterlevelseMetadataToFormValue)({id:"ny",etterlevelseDokumentasjonId:S,kravNummer:h.kravNummer,kravVersjon:h.kravVersjon}))}),h.kravVersjon>1&&(b||x)&&$((await (0,a.getEtterlevelserByEtterlevelseDokumentasjonIdKravNumber)(S,h.kravNummer)).content.length>=1)})()},[]),(0,f.useEffect)(()=>{(async()=>{if(I)if(w.some(e=>(0,E.default)(e.changeStamp.lastModifiedDate).isAfter(I.sendtDato)))K(!0);else if(0!==N.length){let e=[];w.forEach(t=>{e.push(...N.filter(e=>t.tiltakIds.includes(e.id)&&(0,E.default)(e.changeStamp.lastModifiedDate).isAfter(I.sendtDato)))}),K(e.length>0)}else void 0!==h.etterlevelseId&&K((0,E.default)(h.etterlevelseChangeStamp?.lastModifiedDate).isAfter(I.sendtDato))})()},[I,j,N,h]),(0,t.jsx)(g.LinkPanel,{href:(0,u.etterlevelseDokumentasjonTemaCodeKravStatusFilterUrl)(S,p,h.kravNummer,h.kravVersjon),children:(0,t.jsxs)("div",{className:"md:flex justify-between",children:[(0,t.jsxs)("div",{className:"self-start",children:[(0,t.jsxs)("div",{className:"flex items-center",children:[(0,t.jsxs)(k.Detail,{weight:"semibold",children:["K",h.kravNummer,".",h.kravVersjon]}),(0,t.jsxs)("div",{className:"ml-4",children:[h.status===d.EKravStatus.UTGAATT&&(0,t.jsx)(D,{warningMessage:"Utgått krav"}),T&&1===h.kravVersjon&&A<30&&(0,t.jsx)(D,{warningMessage:"Nytt krav"}),T&&R&&A<30&&(0,t.jsx)(D,{warningMessage:"Ny versjon"})]})]}),(0,t.jsx)(c.BodyShort,{children:h.navn}),(0,t.jsx)("div",{className:"flex gap-2",children:!h.isIrrelevant&&(0,t.jsxs)("div",{className:"md:flex w-full gap-2",children:[h.etterlevelseChangeStamp?.lastModifiedDate&&(0,t.jsx)(k.Detail,{className:"whitespace-nowrap",children:"Sist utfylt: "+(0,E.default)(h.etterlevelseChangeStamp?.lastModifiedDate).format("LL")}),M&&M.tildeltMed&&M.tildeltMed.length>=1&&(0,t.jsxs)(k.Detail,{className:"whitespace-nowrap",children:["Tildelt:"," ",M.tildeltMed[0].length>12?M.tildeltMed[0].substring(0,11)+"...":M.tildeltMed[0]]})]})})]}),h&&(0,t.jsxs)("div",{className:"self-center flex gap-2",children:[y.isPersonvernombud()&&B&&U&&(0,t.jsx)(n.default,{}),L&&(0,t.jsx)(r.default,{status:"Inneholder risikoscenario",variant:"alt1"}),h.etterlevelseStatus&&(0,t.jsx)(r.default,{status:(0,v.getEtterlevelseStatus)(h.etterlevelseStatus,h.frist),variant:(0,v.getStatusLabelColor)(h.etterlevelseStatus)})]})]})})},"ShowWarningMessage",0,D])},827006,e=>{e.v(t=>Promise.all(["static/chunks/0-8o14vgld50e.js"].map(t=>e.l(t))).then(()=>t(198912)))}]);