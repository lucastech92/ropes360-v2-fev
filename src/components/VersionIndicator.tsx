const BUILD_VERSION = import.meta.env.VITE_BUILD_TIME || new Date().toISOString().slice(0, 16).replace("T", " ");

export const VersionIndicator = () => {
  return (
    <div className="fixed bottom-2 right-2 z-40 hidden md:block">
      <span className="text-[10px] text-muted-foreground/50 font-mono select-none">
        v{BUILD_VERSION}
      </span>
    </div>
  );
};
