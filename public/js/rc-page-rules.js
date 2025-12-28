/* Roberts Cup - Rules page (scroll style)
   Loaded as: <script type="text/babel" src="js/rc-page-rules.js"></script>
*/
(() => {
  const { useMemo } = React;

  window.RC = window.RC || {};
  const RC = window.RC;
  RC.pages = RC.pages || {};

  const RulesPage = () => {
    const paragraphs = useMemo(
      () => [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed posuere, mi sit amet dictum pretium, dolor massa sodales leo, ac bibendum augue turpis vel urna. Integer at sapien sed mi feugiat finibus.",
        "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Curabitur ut purus at nibh condimentum ultrices. Duis rutrum, mi vitae blandit euismod, arcu sapien ullamcorper mauris, id facilisis justo ipsum ut erat.",
        "Praesent placerat, eros a iaculis fermentum, justo mauris vulputate neque, a posuere metus turpis sed nunc. Donec eget nisi id mauris feugiat semper. Morbi luctus, nibh in ultrices efficitur, urna neque pretium erat, in cursus justo augue vel velit.",
        "Aliquam erat volutpat. Mauris nec sem non nulla porta tristique. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In hac habitasse platea dictumst.",
        "Nam viverra, purus in aliquam interdum, ex odio posuere eros, eget tristique lectus mi sed urna. Suspendisse potenti. Aenean vitae neque at risus pellentesque posuere at vitae massa."
      ],
      []
    );

    return (
      <div
        className="min-h-[calc(100vh-5rem)] px-4 sm:px-6 py-8"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(255,247,214,0.95), rgba(252,231,158,0.75) 45%, rgba(254,243,199,0.9) 100%)"
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-wide text-amber-950" style={{ fontFamily: "serif" }}>
              Rules of the Roberts Cup
            </h1>
            <p className="mt-2 text-sm sm:text-base text-amber-900/80" style={{ fontFamily: "serif" }}>
              A highly official document of questionable authority.
            </p>
          </div>

          {/* Scroll */}
          <div className="relative">
            {/* Roll edges */}
            <div
              className="absolute -top-3 left-8 right-8 h-6 rounded-full shadow-md"
              style={{
                background:
                  "linear-gradient(180deg, rgba(252,231,158,0.95), rgba(254,243,199,0.95))",
                filter: "blur(0px)"
              }}
            />
            <div
              className="absolute -bottom-3 left-10 right-10 h-6 rounded-full shadow-md"
              style={{
                background:
                  "linear-gradient(180deg, rgba(254,243,199,0.95), rgba(252,231,158,0.95))",
                filter: "blur(0px)"
              }}
            />

            <div
              className="relative rounded-3xl border border-amber-900/20 shadow-xl overflow-hidden"
              style={{
                backgroundColor: "rgba(255, 251, 235, 0.92)",
                backgroundImage:
                  "linear-gradient(0deg, rgba(0,0,0,0.03), rgba(0,0,0,0.00)), repeating-linear-gradient(90deg, rgba(120,53,15,0.03) 0px, rgba(120,53,15,0.03) 1px, transparent 1px, transparent 26px)"
              }}
            >
              <div className="px-6 sm:px-10 py-10 sm:py-12">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.30em] text-amber-900/70" style={{ fontFamily: "serif" }}>
                      Roberts Cup Charter
                    </div>
                    <div className="mt-1 text-lg sm:text-xl font-semibold text-amber-950" style={{ fontFamily: "serif" }}>
                      The Official Rules
                    </div>
                  </div>
                  <div className="hidden sm:block text-xs text-amber-900/60" style={{ fontFamily: "serif" }}>
                    Version: Draft • For family use only
                  </div>
                </div>

                <hr className="my-6 border-amber-900/20" />

                <div className="space-y-5 text-[15px] leading-7 text-amber-950/90" style={{ fontFamily: "serif" }}>
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>

                <hr className="my-8 border-amber-900/20" />

                {/* Signers */}
                <div>
                  <div className="text-sm font-semibold text-amber-950" style={{ fontFamily: "serif" }}>
                    Signers
                  </div>
                  <p className="mt-1 text-xs text-amber-900/70" style={{ fontFamily: "serif" }}>
                    Witnessed, approved, and occasionally argued about.
                  </p>

                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {["Nana", "Papa", "Grant", "Frank", "Trent", "Maria", "Grace"].map((name) => (
                      <div key={name} className="rounded-xl border border-amber-900/15 bg-white/40 px-4 py-3">
                        <div
                          className="text-lg text-amber-950"
                          style={{ fontFamily: '"Brush Script MT", cursive' }}
                        >
                          {name}
                        </div>
                        <div className="mt-1 text-[11px] text-amber-900/60" style={{ fontFamily: "serif" }}>
                          Original signer
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Wax seal */}
                  <div className="mt-10 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 blur-sm opacity-40 rounded-full bg-red-900" />
                      <div
                        className="relative w-24 h-24 rounded-full shadow-2xl"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 30%, #ff6b6b, #b91c1c 55%, #7f1d1d 100%)",
                          boxShadow:
                            "0 18px 30px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.15)"
                        }}
                      >
                        <div
                          className="absolute inset-3 rounded-full"
                          style={{
                            border: "2px dashed rgba(255,255,255,0.25)"
                          }}
                        />
                        <div
                          className="absolute inset-0 flex items-center justify-center text-amber-50 font-bold tracking-widest"
                          style={{ fontFamily: "serif" }}
                        >
                          RC
                        </div>
                      </div>
                      <div className="mt-2 text-center text-[11px] text-amber-950/70" style={{ fontFamily: "serif" }}>
                        Sealed with questionable authority
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-amber-950/60" style={{ fontFamily: "serif" }}>
            Tip: When you have the real rules text, we’ll swap it in without changing the vibe.
          </div>
        </div>
      </div>
    );
  };

  RC.pages.RulesPage = RulesPage;
})();
