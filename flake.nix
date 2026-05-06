{
  description = "A very basic flake";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    # This version matches the npm-installed version (you can use 'npm install playwright@newversion' to make sure
    # npm matches the version installed via nix).
    nixpkgs.url = "github:nixos/nixpkgs/15f4ee454b1dce334612fa6843b3e05cf546efab";
  };
  
  outputs = { flake-parts, ... } @ inputs: flake-parts.lib.mkFlake { inherit inputs; } {
    perSystem = { config, self', inputs', pkgs, system, ... }: {
      devShells.default = pkgs.mkShell {
        nativeBuildInputs = with pkgs; [
          nodejs_22
          playwright-driver.browsers
	  vitejs
        ];

        shellHook = ''
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
        '';
      };
    };
    # Declared systems that your flake supports. These will be enumerated in perSystem
    systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
  };
}
